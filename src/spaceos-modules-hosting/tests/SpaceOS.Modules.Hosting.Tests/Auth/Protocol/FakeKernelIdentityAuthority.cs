using System.Collections.Concurrent;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using SpaceOS.Modules.Hosting.Auth;

namespace SpaceOS.Modules.Hosting.Tests.Auth.Protocol;

public enum ProtocolKernelFault
{
    None,
    Timeout,
    Malformed,
}

internal sealed record ProtocolKernelRequest(string Subject, Guid TenantId);

/// <summary>A strict HTTP implementation of the Kernel's online subject/tenant lookup contract.</summary>
internal sealed class FakeKernelIdentityAuthority : IAsyncDisposable
{
    internal const string Origin = "http://127.0.0.1:65535";
    internal const string ServiceAuthReference = "env://PROTOCOL_KERNEL_SERVICE_PROOF";
    internal const string ServiceProof = "protocol-test-service-proof";

    private readonly TestServer _server;
    private readonly ConcurrentDictionary<(string Subject, Guid TenantId), OnlineIdentityAuthorityState> _states = new();
    private readonly ConcurrentQueue<ProtocolKernelRequest> _requests = new();

    internal FakeKernelIdentityAuthority()
    {
        _server = new TestServer(new WebHostBuilder().Configure(app => app.Run(HandleAsync)));
    }

    internal ProtocolKernelFault Fault { get; set; }

    internal int RequestCount => _requests.Count;

    internal IReadOnlyList<ProtocolKernelRequest> Requests => _requests.ToArray();

    internal void Set(OnlineIdentityAuthorityState state)
        => _states[(state.Subject, state.TenantId)] = state;

    internal void Remove(string subject, Guid tenantId)
        => _states.TryRemove((subject, tenantId), out _);

    internal HttpMessageHandler CreateStrictHandler()
        => new ExactOriginTestServerHandler(Origin, _server.CreateHandler());

    private async Task HandleAsync(HttpContext context)
    {
        if (!HttpMethods.IsPost(context.Request.Method)
            || context.Request.Path != "/" + KernelOnlineIdentityAuthorityProtocol.ResolvePath
            || context.Request.QueryString.HasValue
            || !string.Equals(
                context.Request.ContentType,
                "application/json; charset=utf-8",
                StringComparison.OrdinalIgnoreCase)
            || !HasExactAccept(context.Request)
            || !HasExactServiceProof(context.Request))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        var request = await ReadExactRequestAsync(context).ConfigureAwait(false);
        if (request is null)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        _requests.Enqueue(request);
        if (Fault == ProtocolKernelFault.Timeout)
        {
            try
            {
                await Task.Delay(Timeout.InfiniteTimeSpan, context.RequestAborted).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
            {
                // Expected: the production provider owns the bounded cancellation budget.
            }

            return;
        }

        if (Fault == ProtocolKernelFault.Malformed)
        {
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{", context.RequestAborted).ConfigureAwait(false);
            return;
        }

        if (!_states.TryGetValue((request.Subject, request.TenantId), out var state))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        context.Response.ContentType = "application/json";
        var payload = JsonSerializer.Serialize(new
        {
            schemaVersion = KernelOnlineIdentityAuthorityProtocol.SchemaVersion,
            subject = state.Subject,
            tenantId = state.TenantId.ToString("D", CultureInfo.InvariantCulture),
            tenantStatus = state.TenantActive ? "active" : "deactivated",
            membershipStatus = state.MembershipActive ? "active" : "revoked",
            membershipVersion = state.MembershipVersion,
            projectionVersion = state.ProjectionVersion,
            acceptTokensIssuedAtOrAfter = state.AcceptTokensIssuedAtOrAfter
                .ToUniversalTime()
                .ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture),
            permissions = state.Permissions.ToArray(),
            enabledModules = state.EnabledModules.ToArray(),
        });
        await context.Response.WriteAsync(payload, context.RequestAborted).ConfigureAwait(false);
    }

    private static async Task<ProtocolKernelRequest?> ReadExactRequestAsync(HttpContext context)
    {
        try
        {
            using var document = await JsonDocument.ParseAsync(
                context.Request.Body,
                new JsonDocumentOptions
                {
                    AllowTrailingCommas = false,
                    CommentHandling = JsonCommentHandling.Disallow,
                    MaxDepth = 4,
                },
                context.RequestAborted).ConfigureAwait(false);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
                return null;
            var properties = root.EnumerateObject().ToArray();
            if (properties.Length != 2
                || properties.Select(static property => property.Name)
                       .Distinct(StringComparer.Ordinal).Count() != properties.Length
                || !properties.Select(static property => property.Name)
                    .ToHashSet(StringComparer.Ordinal)
                    .SetEquals(["subject", "tenantId"]))
            {
                return null;
            }

            var subjectProperty = root.GetProperty("subject");
            var tenantProperty = root.GetProperty("tenantId");
            if (subjectProperty.ValueKind != JsonValueKind.String
                || tenantProperty.ValueKind != JsonValueKind.String
                || string.IsNullOrWhiteSpace(subjectProperty.GetString())
                || !Guid.TryParseExact(tenantProperty.GetString(), "D", out var tenantId))
            {
                return null;
            }

            return new ProtocolKernelRequest(subjectProperty.GetString()!, tenantId);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static bool HasExactAccept(HttpRequest request)
        => request.GetTypedHeaders().Accept is { Count: 1 } accept
           && string.Equals(accept[0].MediaType.Value, "application/json", StringComparison.OrdinalIgnoreCase)
           && accept[0].Parameters.Count == 0;

    private static bool HasExactServiceProof(HttpRequest request)
        => AuthenticationHeaderValue.TryParse(request.Headers.Authorization.ToString(), out var authorization)
           && string.Equals(authorization.Scheme, "Bearer", StringComparison.Ordinal)
           && string.Equals(authorization.Parameter, ServiceProof, StringComparison.Ordinal)
           && request.Headers.Authorization.Count == 1;

    public ValueTask DisposeAsync()
    {
        _server.Dispose();
        return ValueTask.CompletedTask;
    }
}

internal sealed class ProtocolKernelServiceAuthenticator
    : IKernelOnlineIdentityAuthorityServiceAuthenticator
{
    public ValueTask AuthenticateAsync(
        HttpRequestMessage request,
        string serviceAuthReference,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!string.Equals(
                serviceAuthReference,
                FakeKernelIdentityAuthority.ServiceAuthReference,
                StringComparison.Ordinal))
        {
            throw new InvalidOperationException("The protocol test received an unexpected custody reference.");
        }

        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            FakeKernelIdentityAuthority.ServiceProof);
        return ValueTask.CompletedTask;
    }
}
