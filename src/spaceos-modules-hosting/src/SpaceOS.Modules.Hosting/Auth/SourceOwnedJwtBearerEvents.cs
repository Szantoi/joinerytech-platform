using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// Immutable-dispatch bearer events. <see cref="JwtBearerEvents"/> exposes mutable delegate
/// properties, so source policy lives in sealed virtual overrides that never invoke those
/// properties. A host can therefore mutate a public delegate only into an inert value.
/// </summary>
internal sealed class SourceOwnedJwtBearerEvents : JwtBearerEvents
{
    private readonly OidcJwtBearerRuntimeAttestation _runtimeAttestation;
    private readonly CanonicalOidcAccessTokenProfile _profile;

    internal SourceOwnedJwtBearerEvents(
        SpaceOsModuleAuthOptions options,
        OidcJwtBearerRuntimeAttestation runtimeAttestation)
    {
        ArgumentNullException.ThrowIfNull(options);
        _runtimeAttestation = runtimeAttestation
            ?? throw new ArgumentNullException(nameof(runtimeAttestation));
        _profile = new CanonicalOidcAccessTokenProfile(
            options.Authority!,
            options.Audience!,
            options.AuthorizedParty!,
            options.TokenType,
            options.AccessTokenPayloadType);
    }

    public sealed override Task MessageReceived(MessageReceivedContext context)
    {
        if (!_runtimeAttestation.IsExactRequest(context.Options))
            context.Fail("oidc_runtime_attestation_failed");
        return Task.CompletedTask;
    }

    public sealed override async Task TokenValidated(TokenValidatedContext context)
    {
        if (!_runtimeAttestation.IsExactRequest(context.Options))
        {
            context.Fail("oidc_runtime_attestation_failed");
            return;
        }

        var validator = context.HttpContext.RequestServices
            .GetRequiredService<CanonicalOidcAccessTokenValidator>();
        var stateProvider = context.HttpContext.RequestServices
            .GetRequiredService<IOnlineIdentityAuthorityStateProvider>();

        try
        {
            var result = await validator.ValidateAsync(
                context.Principal!,
                context.SecurityToken,
                _profile,
                stateProvider,
                context.HttpContext.RequestAborted).ConfigureAwait(false);
            if (!result.IsValid)
                context.Fail(result.Code);
        }
        catch (Exception) when (!context.HttpContext.RequestAborted.IsCancellationRequested)
        {
            // Online authority is a hard dependency. It never degrades to token-only auth.
            context.Fail("online_authority_unavailable");
        }
    }

    public sealed override Task AuthenticationFailed(AuthenticationFailedContext context)
        => Task.CompletedTask;

    public sealed override Task Challenge(JwtBearerChallengeContext context)
    {
        context.HandleResponse();
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return WriteProblemAsync(
            context.HttpContext,
            StatusCodes.Status401Unauthorized,
            "https://tools.ietf.org/html/rfc7235#section-3.1",
            "Unauthorized",
            "A valid JWT Bearer token is required.");
    }

    public sealed override Task Forbidden(ForbiddenContext context)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return WriteProblemAsync(
            context.HttpContext,
            StatusCodes.Status403Forbidden,
            "https://tools.ietf.org/html/rfc7231#section-6.5.3",
            "Forbidden",
            "Insufficient permissions for this operation.");
    }

    private static Task WriteProblemAsync(
        HttpContext context,
        int status,
        string type,
        string title,
        string detail)
        => context.Response.WriteAsJsonAsync(
            new
            {
                type,
                title,
                status,
                detail,
                correlationId = context.TraceIdentifier,
            },
            options: null,
            contentType: "application/problem+json");
}
