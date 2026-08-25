using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>Creates the private transport owned exclusively by the strict OIDC manager.</summary>
internal static class OidcAuthorityTransport
{
    internal const string TestAssemblyName = "SpaceOS.Modules.Hosting.Tests";
    internal const string PinnedTestIssuer = "https://identity.protocol.test/realms/spaceos";

    internal static HttpClient CreateHttpClient(
        string expectedIssuer,
        OidcAuthoritySecurityOptions options,
        IHostEnvironment environment,
        OidcAuthorityTestTransportOverride? testTransport)
    {
        var authority = new Uri(expectedIssuer, UriKind.Absolute);
        if (!string.Equals(authority.Scheme, Uri.UriSchemeHttps, StringComparison.Ordinal)
            || !string.IsNullOrEmpty(authority.UserInfo)
            || !string.IsNullOrEmpty(authority.Query)
            || !string.IsNullOrEmpty(authority.Fragment))
        {
            throw new InvalidOperationException(
                "The source-owned OIDC configuration transport requires an exact HTTPS authority URI.");
        }

        HttpMessageHandler inner;
        if (testTransport is null)
        {
            if (IsPinnedTestProcess(environment, expectedIssuer))
            {
                throw new InvalidOperationException(
                    "The pinned in-process OIDC authority requires the friend-test transport marker.");
            }

            inner = new SocketsHttpHandler
            {
                AllowAutoRedirect = false,
                UseProxy = false,
                UseCookies = false,
                AutomaticDecompression = System.Net.DecompressionMethods.None,
                ConnectTimeout = TimeSpan.FromMilliseconds(options.BackchannelTimeoutMilliseconds),
                MaxResponseHeadersLength = 16,
            };
        }
        else
        {
            if (!IsPinnedTestProcess(environment, expectedIssuer)
                || !OidcAuthorityTestTransportRegistration.IsSourceMarked(testTransport))
            {
                throw new InvalidOperationException(
                    "The OIDC in-process transport is restricted to the exact friend test assembly and source-pinned fake HTTPS authority.");
            }

            inner = testTransport.CreateHandler();
        }

        var boundary = new ExactOidcOriginBackchannelHandler(authority, inner);
        return new HttpClient(boundary, disposeHandler: true)
        {
            Timeout = TimeSpan.FromMilliseconds(options.BackchannelTimeoutMilliseconds),
        };
    }

    internal static bool IsPinnedTestProcess(IHostEnvironment environment, string expectedIssuer)
        => string.Equals(environment.ApplicationName, TestAssemblyName, StringComparison.Ordinal)
           && string.Equals(environment.EnvironmentName, Environments.Production, StringComparison.Ordinal)
           && string.Equals(expectedIssuer, PinnedTestIssuer, StringComparison.Ordinal);
}

/// <summary>Friend-test-only source-marked transport registration.</summary>
internal static class OidcAuthorityTestTransportRegistration
{
    private static readonly object SourceMarker = new();

    internal static IServiceCollection AddOidcAuthorityTestTransport(
        this IServiceCollection services,
        Func<HttpMessageHandler> handlerFactory)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(handlerFactory);
        services.Replace(ServiceDescriptor.Singleton(
            new OidcAuthorityTestTransportOverride(handlerFactory, SourceMarker)));
        return services;
    }

    internal static bool IsSourceMarked(OidcAuthorityTestTransportOverride testTransport)
        => testTransport.HasMarker(SourceMarker);
}

internal sealed class OidcAuthorityTestTransportOverride(
    Func<HttpMessageHandler> handlerFactory,
    object sourceMarker)
{
    internal bool HasMarker(object expected) => ReferenceEquals(sourceMarker, expected);

    internal HttpMessageHandler CreateHandler()
        => handlerFactory()
           ?? throw new InvalidOperationException(
               "The OIDC friend-test transport factory returned no handler.");
}
