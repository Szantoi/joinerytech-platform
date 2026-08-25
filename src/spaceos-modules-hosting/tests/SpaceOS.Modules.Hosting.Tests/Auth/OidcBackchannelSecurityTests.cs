using System.Net;
using SpaceOS.Modules.Hosting.Auth;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

public sealed class OidcBackchannelSecurityTests
{
    [Fact]
    public void Production_transport_disables_ambient_and_redirect_capabilities()
    {
        using var handler = new ExactOidcOriginBackchannelHandler(
            new Uri("https://identity.example.test/realms/spaceos"),
            TimeSpan.FromMilliseconds(1500));

        var transport = Assert.IsType<SocketsHttpHandler>(handler.InnerHandler);
        Assert.False(transport.AllowAutoRedirect);
        Assert.False(transport.UseProxy);
        Assert.False(transport.UseCookies);
        Assert.Equal(DecompressionMethods.None, transport.AutomaticDecompression);
        Assert.Equal(TimeSpan.FromMilliseconds(1500), transport.ConnectTimeout);
        Assert.Equal(16, transport.MaxResponseHeadersLength);
    }

    [Theory]
    [InlineData("http://identity.example.test/realms/spaceos/.well-known/openid-configuration")]
    [InlineData("https://substituted.example.test/realms/spaceos/.well-known/openid-configuration")]
    [InlineData("https://identity.example.test:444/realms/spaceos/.well-known/openid-configuration")]
    public async Task Cross_origin_request_is_rejected_before_transport(string address)
    {
        using var handler = new ExactOidcOriginBackchannelHandler(
            new Uri("https://identity.example.test/realms/spaceos"),
            TimeSpan.FromMilliseconds(1500));
        using var client = new HttpClient(handler);

        var exception = await Assert.ThrowsAsync<HttpRequestException>(() => client.GetAsync(address));

        Assert.Contains("source-pinned origin", exception.Message, StringComparison.Ordinal);
    }
}
