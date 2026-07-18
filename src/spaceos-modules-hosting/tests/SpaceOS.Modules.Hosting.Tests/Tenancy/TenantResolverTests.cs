using System.Security.Claims;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Tenancy;

/// <summary>Pure unit tests of the ADR-061 (T1) tenant resolution rules.</summary>
public sealed class TenantResolverTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid TenantC = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private static ClaimsPrincipal PrincipalWith(params Claim[] claims)
        => new(new ClaimsIdentity(claims, "test"));

    [Fact]
    public void Tid_claim_without_header_resolves_to_tid()
    {
        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantIdClaim, TenantA.ToString())), null);

        Assert.Equal(TenantResolutionStatus.Resolved, result.Status);
        Assert.Equal(TenantA, result.TenantId);
    }

    [Fact]
    public void Header_matching_tid_is_accepted()
    {
        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantIdClaim, TenantA.ToString())),
            TenantA.ToString());

        Assert.Equal(TenantResolutionStatus.Resolved, result.Status);
        Assert.Equal(TenantA, result.TenantId);
    }

    [Fact]
    public void Header_not_in_token_tenants_is_rejected()
    {
        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantIdClaim, TenantA.ToString())),
            TenantB.ToString());

        Assert.Equal(TenantResolutionStatus.HeaderNotInTokenTenants, result.Status);
        Assert.Equal(TenantB.ToString(), result.RejectedHeaderValue);
    }

    [Fact]
    public void Malformed_header_is_rejected_not_parsed_leniently()
    {
        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantIdClaim, TenantA.ToString())),
            "not-a-guid");

        Assert.Equal(TenantResolutionStatus.HeaderNotInTokenTenants, result.Status);
    }

    [Fact]
    public void Tenant_list_claim_allows_selecting_a_member_tenant()
    {
        var listJson = $$"""[{"tenantId":"{{TenantA}}"},{"tenantId":"{{TenantB}}"}]""";
        var principal = PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, listJson));

        var selected = TenantResolver.Resolve(principal, TenantB.ToString());
        Assert.Equal(TenantResolutionStatus.Resolved, selected.Status);
        Assert.Equal(TenantB, selected.TenantId);

        var rejected = TenantResolver.Resolve(principal, TenantC.ToString());
        Assert.Equal(TenantResolutionStatus.HeaderNotInTokenTenants, rejected.Status);
    }

    [Fact]
    public void Tenant_list_claim_defaults_to_first_entry_without_header()
    {
        var listJson = $$"""[{"tenantId":"{{TenantA}}"},{"tenantId":"{{TenantB}}"}]""";

        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, listJson)), null);

        Assert.Equal(TenantResolutionStatus.Resolved, result.Status);
        Assert.Equal(TenantA, result.TenantId);
    }

    [Fact]
    public void String_wrapped_tenant_list_is_unwrapped_before_parsing()
    {
        // Keycloak Script Mapper JSON.stringify() guard (kernel BE-01).
        var wrapped = System.Text.Json.JsonSerializer.Serialize(
            $$"""[{"tenantId":"{{TenantA}}"}]""");

        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, wrapped)), null);

        Assert.Equal(TenantResolutionStatus.Resolved, result.Status);
        Assert.Equal(TenantA, result.TenantId);
    }

    [Fact]
    public void Malformed_tenant_list_claim_is_treated_as_absent()
    {
        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, "{not json[")), null);

        Assert.Equal(TenantResolutionStatus.NoTenantClaim, result.Status);
    }

    [Fact]
    public void Legacy_tenant_id_claim_still_resolves()
    {
        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.LegacyTenantIdClaim, TenantA.ToString())), null);

        Assert.Equal(TenantResolutionStatus.Resolved, result.Status);
        Assert.Equal(TenantA, result.TenantId);
    }

    [Fact]
    public void Token_without_tenant_identity_yields_NoTenantClaim()
    {
        var result = TenantResolver.Resolve(PrincipalWith(new Claim("sub", "someone")), null);

        Assert.Equal(TenantResolutionStatus.NoTenantClaim, result.Status);
    }

    [Fact]
    public void Empty_guid_claims_are_ignored()
    {
        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantIdClaim, Guid.Empty.ToString())), null);

        Assert.Equal(TenantResolutionStatus.NoTenantClaim, result.Status);
    }
}
