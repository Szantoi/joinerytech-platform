using System.Collections.Immutable;
using System.Net;
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Http;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// Source-owned primary handler that attests the final request immediately before its private
/// transport. Keeping the transport private prevents later handlers from being inserted below
/// the boundary or replacing its network policy.
/// </summary>
internal sealed class KernelOnlineIdentityAuthoritySendBoundaryHandler : HttpMessageHandler
{
    internal const string TestAssemblyName = "SpaceOS.Modules.Hosting.Tests";

    private readonly Uri? _expectedResolveUri;
    private readonly HttpMessageInvoker? _transport;
    private readonly HttpMessageHandler? _rejectedPrimaryHandler;
    private bool _disposed;

    private KernelOnlineIdentityAuthoritySendBoundaryHandler(
        Uri expectedResolveUri,
        HttpMessageHandler transport)
    {
        _expectedResolveUri = expectedResolveUri;
        _transport = new HttpMessageInvoker(transport, disposeHandler: true);
    }

    private KernelOnlineIdentityAuthoritySendBoundaryHandler(
        HttpMessageHandler? rejectedPrimaryHandler)
    {
        _rejectedPrimaryHandler = rejectedPrimaryHandler;
    }

    internal bool IsSourceOwnedTransportBoundary => _transport is not null && !_disposed;

    internal static KernelOnlineIdentityAuthoritySendBoundaryHandler Create(
        KernelOnlineIdentityAuthorityOptions options,
        IHostEnvironment environment,
        KernelOnlineIdentityAuthorityTestTransportOverride? testTransport)
    {
        var transport = testTransport is null
            ? CreateProductionTransport(options)
            : CreateControlledTestTransport(options, environment, testTransport);

        return new KernelOnlineIdentityAuthoritySendBoundaryHandler(
            KernelOnlineIdentityAuthorityEndpointPolicy.CreateResolveUri(options.BaseUrl!),
            transport);
    }

    internal static KernelOnlineIdentityAuthoritySendBoundaryHandler RejectPrimaryOverride(
        HttpMessageHandler? rejectedPrimaryHandler)
        => new(rejectedPrimaryHandler);

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        if (_transport is null
            || _expectedResolveUri is null
            || !KernelOnlineIdentityAuthorityRequestAttestation.IsExactAtSendBoundary(
                request,
                _expectedResolveUri))
        {
            throw new KernelOnlineIdentityAuthorityException(
                KernelOnlineIdentityAuthorityOutcome.ServiceAuthenticationError,
                "The Kernel authority request failed its final source-owned transport-boundary attestation.");
        }

        return _transport.SendAsync(request, cancellationToken);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _disposed = true;
            _transport?.Dispose();
            _rejectedPrimaryHandler?.Dispose();
        }

        base.Dispose(disposing);
    }

    private static HttpMessageHandler CreateProductionTransport(
        KernelOnlineIdentityAuthorityOptions options)
    {
        var configuredBaseUri = KernelOnlineIdentityAuthorityEndpointPolicy.CreateBaseUri(options.BaseUrl!);
        if (!string.Equals(
                configuredBaseUri.Scheme,
                Uri.UriSchemeHttps,
                StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "The runtime Kernel authority sockets transport is unconditionally HTTPS-only.");
        }

        var productionPin = KernelOnlineIdentityAuthorityProtocol.ProductionBaseUrl;
        if (string.IsNullOrWhiteSpace(productionPin)
            || !Uri.TryCreate(productionPin, UriKind.Absolute, out var pinnedBaseUri)
            || !KernelOnlineIdentityAuthorityEndpointPolicy.IsExactNormalizedUri(
                configuredBaseUri,
                pinnedBaseUri))
        {
            throw new InvalidOperationException(
                "The runtime Kernel authority sockets transport requires the exact source-pinned production HTTPS endpoint.");
        }

        return new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            UseProxy = false,
            UseCookies = false,
            ConnectTimeout = TimeSpan.FromMilliseconds(options.AttemptTimeoutMilliseconds),
            MaxResponseHeadersLength = 16,
        };
    }

    private static HttpMessageHandler CreateControlledTestTransport(
        KernelOnlineIdentityAuthorityOptions options,
        IHostEnvironment environment,
        KernelOnlineIdentityAuthorityTestTransportOverride testTransport)
    {
        var configuredBaseUri = KernelOnlineIdentityAuthorityEndpointPolicy.CreateBaseUri(options.BaseUrl!);
        var pinnedTestBaseUri = KernelOnlineIdentityAuthorityEndpointPolicy.CreateBaseUri(
            KernelOnlineIdentityAuthorityProtocol.DevelopmentLoopbackBaseUrl);
        if (!environment.IsDevelopment()
            || !string.Equals(
                environment.ApplicationName,
                TestAssemblyName,
                StringComparison.Ordinal)
            || !options.AllowDevelopmentLoopbackHttp
            || !KernelOnlineIdentityAuthorityEndpointPolicy.IsExactNormalizedUri(
                configuredBaseUri,
                pinnedTestBaseUri))
        {
            throw new InvalidOperationException(
                "The Kernel authority in-process transport override is restricted to the exact test assembly and pinned Development loopback endpoint.");
        }

        return testTransport.CreateHandler();
    }
}

/// <summary>
/// Runs after all named-client configuration and converts any primary-handler replacement into
/// a source-owned rejecting boundary. Inserting this filter first makes its post-step the final
/// builder action even when callers register later filters.
/// </summary>
internal sealed class KernelOnlineIdentityAuthorityHandlerBuilderFilter(string clientName)
    : IHttpMessageHandlerBuilderFilter
{
    private readonly string _clientName = clientName;

    public Action<HttpMessageHandlerBuilder> Configure(Action<HttpMessageHandlerBuilder> next)
    {
        ArgumentNullException.ThrowIfNull(next);

        return builder =>
        {
            next(builder);
            if (!string.Equals(builder.Name, _clientName, StringComparison.Ordinal))
                return;

            KernelOnlineIdentityAuthorityBuilderAttestation.TryTake(
                builder.Services,
                out var sourceBoundary);
            if (ReferenceEquals(builder.PrimaryHandler, sourceBoundary)
                && sourceBoundary is KernelOnlineIdentityAuthoritySendBoundaryHandler boundary
                && boundary.IsSourceOwnedTransportBoundary)
            {
                return;
            }

            if (sourceBoundary is not null
                && !ReferenceEquals(sourceBoundary, builder.PrimaryHandler))
            {
                sourceBoundary.Dispose();
            }

            builder.PrimaryHandler =
                KernelOnlineIdentityAuthoritySendBoundaryHandler.RejectPrimaryOverride(
                    builder.PrimaryHandler);
        };
    }
}

internal static class KernelOnlineIdentityAuthorityBuilderAttestation
{
    private static readonly ConditionalWeakTable<
        IServiceProvider,
        KernelOnlineIdentityAuthoritySendBoundaryHandler> SourceBoundaries = new();
    private static readonly object Sync = new();

    internal static void Stamp(
        IServiceProvider services,
        KernelOnlineIdentityAuthoritySendBoundaryHandler boundary)
    {
        lock (Sync)
        {
            if (SourceBoundaries.TryGetValue(services, out var previousBoundary))
            {
                SourceBoundaries.Remove(services);
                previousBoundary.Dispose();
            }

            SourceBoundaries.Add(services, boundary);
        }
    }

    internal static bool TryTake(
        IServiceProvider services,
        out KernelOnlineIdentityAuthoritySendBoundaryHandler? boundary)
    {
        lock (Sync)
        {
            if (!SourceBoundaries.TryGetValue(services, out boundary))
                return false;

            SourceBoundaries.Remove(services);
            return true;
        }
    }
}

/// <summary>
/// Friend-test-only transport hook. Production code cannot name this type, and the boundary also
/// verifies the exact test assembly, Development environment and source-pinned loopback endpoint.
/// </summary>
internal sealed class KernelOnlineIdentityAuthorityTestTransportOverride(
    Func<HttpMessageHandler> handlerFactory)
{
    private readonly Func<HttpMessageHandler> _handlerFactory = handlerFactory;

    internal HttpMessageHandler CreateHandler()
        => _handlerFactory()
           ?? throw new InvalidOperationException(
               "The Kernel authority test transport factory returned no handler.");
}

internal static class KernelOnlineIdentityAuthorityRequestAttestation
{
    private static readonly HttpRequestOptionsKey<SendBoundaryStamp> StampKey =
        new("SpaceOS.Modules.Hosting.KernelIdentityAuthority.SendBoundary/v1");

    internal static void Stamp(
        HttpRequestMessage request,
        Uri expectedResolveUri,
        HttpContent expectedContent)
    {
        request.Options.Set(
            StampKey,
            new SendBoundaryStamp(
                expectedResolveUri,
                expectedContent,
                Snapshot(request.Headers),
                Snapshot(expectedContent.Headers)));
    }

    internal static bool IsExactAtSendBoundary(
        HttpRequestMessage request,
        Uri sourcePinnedResolveUri)
    {
        if (!request.Options.TryGetValue(StampKey, out var stamp)
            || !string.Equals(request.Method.Method, HttpMethod.Post.Method, StringComparison.Ordinal)
            || request.Version != HttpVersion.Version11
            || request.VersionPolicy != HttpVersionPolicy.RequestVersionOrLower
            || !KernelOnlineIdentityAuthorityEndpointPolicy.IsExactNormalizedUri(
                stamp.ExpectedResolveUri,
                sourcePinnedResolveUri)
            || !KernelOnlineIdentityAuthorityEndpointPolicy.IsExactNormalizedUri(
                request.RequestUri,
                sourcePinnedResolveUri)
            || !ReferenceEquals(request.Content, stamp.ExpectedContent))
        {
            return false;
        }

        return HeadersEqual(stamp.RequestHeaders, Snapshot(request.Headers))
               && HeadersEqual(stamp.ContentHeaders, Snapshot(stamp.ExpectedContent.Headers));
    }

    private static ImmutableArray<HeaderSnapshot> Snapshot(HttpHeaders headers)
        => headers
            .OrderBy(static header => header.Key, StringComparer.OrdinalIgnoreCase)
            .Select(static header => new HeaderSnapshot(
                header.Key,
                header.Value.ToImmutableArray()))
            .ToImmutableArray();

    private static bool HeadersEqual(
        ImmutableArray<HeaderSnapshot> expected,
        ImmutableArray<HeaderSnapshot> actual)
    {
        if (expected.Length != actual.Length)
            return false;

        for (var index = 0; index < expected.Length; index++)
        {
            if (!string.Equals(
                    expected[index].Name,
                    actual[index].Name,
                    StringComparison.OrdinalIgnoreCase)
                || !expected[index].Values.SequenceEqual(
                    actual[index].Values,
                    StringComparer.Ordinal))
            {
                return false;
            }
        }

        return true;
    }

    private sealed record SendBoundaryStamp(
        Uri ExpectedResolveUri,
        HttpContent ExpectedContent,
        ImmutableArray<HeaderSnapshot> RequestHeaders,
        ImmutableArray<HeaderSnapshot> ContentHeaders);

    private sealed record HeaderSnapshot(
        string Name,
        ImmutableArray<string> Values);
}
