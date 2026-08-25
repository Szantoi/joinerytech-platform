using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// Runs JwtBearer with a fresh source-owned options graph per request. Public cached options are
/// retained only as an attestation input; base JwtBearer never receives any of their mutable
/// validation objects, token handlers, collections or events.
/// </summary>
internal sealed class SourceOwnedJwtBearerHandler : JwtBearerHandler
{
    private readonly OidcJwtBearerRuntimeAttestation _runtimeAttestation;

    public SourceOwnedJwtBearerHandler(
        IOptionsMonitor<JwtBearerOptions> publicOptions,
        ILoggerFactory logger,
        UrlEncoder encoder,
        OidcJwtBearerRuntimeAttestation runtimeAttestation)
        : this(
            logger,
            encoder,
            runtimeAttestation,
            CreatePrivateOptionsMonitor(publicOptions, runtimeAttestation))
    {
    }

    private SourceOwnedJwtBearerHandler(
        ILoggerFactory logger,
        UrlEncoder encoder,
        OidcJwtBearerRuntimeAttestation runtimeAttestation,
        IOptionsMonitor<JwtBearerOptions> privateOptions)
        : base(privateOptions, logger, encoder)
    {
        _runtimeAttestation = runtimeAttestation;
    }

    protected override Task InitializeEventsAsync()
    {
        if (Options.Events is not SourceOwnedJwtBearerEvents sourceEvents)
            throw new InvalidOperationException("The request-private bearer events were not source-owned.");

        // Do not call base: it can resolve mutable Events/EventsType from the options graph.
        Events = sourceEvents;
        return Task.CompletedTask;
    }

    protected override string? ResolveTarget(string? scheme)
        => _runtimeAttestation.IsExactRequest(Options)
            ? base.ResolveTarget(scheme)
            : null;

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        => _runtimeAttestation.IsExactRequest(Options)
            ? base.HandleAuthenticateAsync()
            : Task.FromResult(AuthenticateResult.Fail("oidc_runtime_attestation_failed"));

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
        => _runtimeAttestation.IsExactRequest(Options)
            ? base.HandleChallengeAsync(properties)
            : WriteMutationDenialAsync(StatusCodes.Status401Unauthorized, "Unauthorized");

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties)
        => _runtimeAttestation.IsExactRequest(Options)
            ? base.HandleForbiddenAsync(properties)
            : WriteMutationDenialAsync(StatusCodes.Status403Forbidden, "Forbidden");

    private static IOptionsMonitor<JwtBearerOptions> CreatePrivateOptionsMonitor(
        IOptionsMonitor<JwtBearerOptions> publicOptions,
        OidcJwtBearerRuntimeAttestation runtimeAttestation)
    {
        // Materialization executes all public configure/post-configure callbacks. The source
        // post-configurer seals that graph, but the graph itself is never passed to base.
        _ = publicOptions.Get(JwtBearerDefaults.AuthenticationScheme);
        return runtimeAttestation.CreateRequestOptionsMonitor();
    }

    private Task WriteMutationDenialAsync(int statusCode, string title)
    {
        Response.StatusCode = statusCode;
        return Response.WriteAsJsonAsync(
            new
            {
                type = statusCode == StatusCodes.Status401Unauthorized
                    ? "https://tools.ietf.org/html/rfc7235#section-3.1"
                    : "https://tools.ietf.org/html/rfc7231#section-6.5.3",
                title,
                status = statusCode,
                detail = "The bearer validation trust profile failed runtime attestation.",
                correlationId = Context.TraceIdentifier,
            },
            options: null,
            contentType: "application/problem+json");
    }
}
