using System.Security.Claims;
using SpaceOS.Modules.Hosting.Auth;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

/// <summary>Fail-closed audit identity extraction from authenticated principals.</summary>
public sealed class ClaimsPrincipalUserIdExtensionsTests
{
    private static readonly Guid UserId = Guid.Parse("55555555-5555-5555-5555-555555555555");

    [Fact]
    public void RawSubClaim_ReturnsGuidUserId()
    {
        var principal = PrincipalWith(new Claim("sub", UserId.ToString()));

        Assert.Equal(UserId, principal.GetRequiredUserId());
    }

    [Fact]
    public void MappedNameIdentifier_ReturnsGuidUserId()
    {
        var principal = PrincipalWith(new Claim(ClaimTypes.NameIdentifier, UserId.ToString()));

        Assert.Equal(UserId, principal.GetRequiredUserId());
    }

    [Fact]
    public void MissingOrNonGuidIdentity_ThrowsInsteadOfInventingAnAuditUser()
    {
        var principal = PrincipalWith(new Claim("sub", "not-a-guid"));

        Assert.Throws<InvalidOperationException>(() => principal.GetRequiredUserId());
    }

    private static ClaimsPrincipal PrincipalWith(params Claim[] claims)
        => new(new ClaimsIdentity(claims, "test"));
}
