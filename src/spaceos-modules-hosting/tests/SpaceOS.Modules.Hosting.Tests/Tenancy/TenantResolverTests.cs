using System.Security.Claims;
using System.Text.Json;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Tenancy;

/// <summary>Fail-closed tests of the native, one-selected-tenant authority profile.</summary>
public sealed class TenantResolverTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static ClaimsPrincipal PrincipalWith(params Claim[] claims)
        => new(new ClaimsIdentity(claims, "test"));

    private static Claim CanonicalClaim(Guid tenantId, string module = "spaceos.maintenance")
        => new(
            TenancyDefaults.TenantListClaim,
            $$"""[{"tenant_id":"{{tenantId:D}}","permissions":["{{module}}.view"],"enabled_modules":["{{module}}"]}]""");

    [Fact]
    public void Exact_native_projection_resolves_selected_tenant_and_modules()
    {
        var principal = PrincipalWith(CanonicalClaim(TenantA));

        var result = TenantResolver.Resolve(principal, null);

        Assert.Equal(TenantResolutionStatus.Resolved, result.Status);
        Assert.Equal(TenantA, result.TenantId);
        Assert.Equal(new[] { "spaceos.maintenance" }, TenantResolver.GetEnabledModules(principal, TenantA));
        Assert.Equal(new[] { "spaceos.maintenance.view" }, TenantResolver.GetPermissions(principal, TenantA));
    }

    [Fact]
    public void Two_fresh_single_tenant_tokens_resolve_independently()
    {
        var tokenA = PrincipalWith(CanonicalClaim(TenantA, "spaceos.maintenance"));
        var tokenB = PrincipalWith(CanonicalClaim(TenantB, "spaceos.qa"));

        Assert.Equal(TenantA, TenantResolver.Resolve(tokenA, null).TenantId);
        Assert.Equal(TenantB, TenantResolver.Resolve(tokenB, null).TenantId);
        Assert.Empty(TenantResolver.GetEnabledModules(tokenA, TenantB));
        Assert.Empty(TenantResolver.GetEnabledModules(tokenB, TenantA));
        Assert.Empty(TenantResolver.GetPermissions(tokenA, TenantB));
        Assert.Empty(TenantResolver.GetPermissions(tokenB, TenantA));
    }

    [Fact]
    public void One_object_claim_is_accepted_as_native_array_handler_materialization()
    {
        var objectClaim = new Claim(
            TenancyDefaults.TenantListClaim,
            $$"""{"tenant_id":"{{TenantA:D}}","permissions":["spaceos.qa.admin"],"enabled_modules":["spaceos.qa"]}""");

        var result = TenantResolver.Resolve(PrincipalWith(objectClaim), null);

        Assert.Equal(TenantResolutionStatus.Resolved, result.Status);
        Assert.Equal(TenantA, result.TenantId);
    }

    [Fact]
    public void Bounded_tenant_type_and_brand_skin_metadata_are_allowed()
    {
        var claim = new Claim(
            TenancyDefaults.TenantListClaim,
            $$"""{"tenant_id":"{{TenantA:D}}","permissions":["spaceos.qa.view"],"enabled_modules":["spaceos.qa"],"tenant_type":"manufacturer","brand_skin":"doorstar"}""");

        var result = TenantResolver.Resolve(PrincipalWith(claim), null);

        Assert.Equal(TenantResolutionStatus.Resolved, result.Status);
        Assert.Equal(TenantA, result.TenantId);
    }

    [Fact]
    public void Matching_header_is_only_a_selection_and_foreign_header_is_denied()
    {
        var principal = PrincipalWith(CanonicalClaim(TenantA));

        var matching = TenantResolver.Resolve(principal, TenantA.ToString("D"));
        var foreign = TenantResolver.Resolve(principal, TenantB.ToString("D"));

        Assert.Equal(TenantResolutionStatus.Resolved, matching.Status);
        Assert.Equal(TenantResolutionStatus.HeaderNotInTokenTenants, foreign.Status);
    }

    [Theory]
    [InlineData("tid")]
    [InlineData("tenant_id")]
    [InlineData("permissions")]
    [InlineData("enabled_modules")]
    [InlineData("tenantId")]
    [InlineData("spaceosTenants")]
    [InlineData("enabledModules")]
    public void Mixed_or_alias_authority_is_rejected(string claimType)
    {
        var principal = PrincipalWith(CanonicalClaim(TenantA), new Claim(claimType, TenantA.ToString("D")));

        var result = TenantResolver.Resolve(principal, null);

        Assert.Equal(TenantResolutionStatus.InvalidTenantAuthority, result.Status);
        Assert.Empty(TenantResolver.GetEnabledModules(principal, TenantA));
        Assert.Empty(TenantResolver.GetPermissions(principal, TenantA));
    }

    [Fact]
    public void Legacy_flat_profile_is_not_a_fallback()
    {
        var principal = PrincipalWith(
            new Claim(TenancyDefaults.TenantIdClaim, TenantA.ToString("D")),
            new Claim(TenancyDefaults.EnabledModulesClaim, "[\"spaceos.maintenance\"]"));

        Assert.Equal(TenantResolutionStatus.InvalidTenantAuthority, TenantResolver.Resolve(principal, null).Status);
        Assert.Empty(TenantResolver.GetEnabledModules(principal, TenantA));
    }

    [Fact]
    public void Multi_entry_and_multiple_claim_profiles_are_rejected_without_first_entry_selection()
    {
        var multiEntry = PrincipalWith(new Claim(
            TenancyDefaults.TenantListClaim,
            $$"""[{"tenant_id":"{{TenantA:D}}","permissions":[],"enabled_modules":[]},{"tenant_id":"{{TenantB:D}}","permissions":[],"enabled_modules":[]}]"""));
        var multipleClaims = PrincipalWith(CanonicalClaim(TenantA), CanonicalClaim(TenantB));

        Assert.Equal(TenantResolutionStatus.InvalidTenantAuthority, TenantResolver.Resolve(multiEntry, null).Status);
        Assert.Equal(TenantResolutionStatus.InvalidTenantAuthority, TenantResolver.Resolve(multipleClaims, null).Status);
    }

    [Fact]
    public void Json_string_wrapped_projection_is_rejected()
    {
        var wrapped = JsonSerializer.Serialize(CanonicalClaim(TenantA).Value);

        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, wrapped)), null);

        Assert.Equal(TenantResolutionStatus.InvalidTenantAuthority, result.Status);
    }

    [Theory]
    [InlineData("{\"tenant_id\":\"11111111-1111-1111-1111-111111111111\",\"permissions\":[\"spaceos.qa.view\"],\"enabled_modules\":[\"spaceos.qa\"],\"extra\":true}")]
    [InlineData("{\"tenant_id\":\"11111111-1111-1111-1111-111111111111\",\"permissions\":[\"spaceos.qa.view\",\"spaceos.qa.view\"],\"enabled_modules\":[\"spaceos.qa\"]}")]
    [InlineData("{\"tenant_id\":\"11111111-1111-1111-1111-111111111111\",\"permissions\":[\"spaceos.qa.view\"],\"enabled_modules\":[\"spaceos.maintenance\"]}")]
    [InlineData("{\"tenant_id\":\"11111111-1111-1111-1111-111111111111\",\"permissions\":[\"spaceos.qa.admin\",\"spaceos.maintenance.view\"],\"enabled_modules\":[\"spaceos.qa\",\"spaceos.maintenance\"]}")]
    [InlineData("{\"tenant_id\":\"00000000-0000-0000-0000-000000000000\",\"permissions\":[],\"enabled_modules\":[]}")]
    [InlineData("{\"tenant_id\":\"00000000-0000-0000-0000-000000000001\",\"permissions\":[],\"enabled_modules\":[]}")]
    [InlineData("{\"tenant_id\":\"00000000-0000-0000-0000-000000000002\",\"permissions\":[],\"enabled_modules\":[]}")]
    public void Malformed_or_widened_entry_is_rejected(string rawEntry)
    {
        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, rawEntry)), null);

        Assert.Equal(TenantResolutionStatus.InvalidTenantAuthority, result.Status);
    }

    [Fact]
    public void Duplicate_json_property_is_rejected()
    {
        var raw = $$"""{"tenant_id":"{{TenantA:D}}","tenant_id":"{{TenantB:D}}","permissions":[],"enabled_modules":[]}""";

        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, raw)), null);

        Assert.Equal(TenantResolutionStatus.InvalidTenantAuthority, result.Status);
    }

    [Fact]
    public void Structurally_valid_but_unregistered_module_is_rejected()
    {
        var raw = $$"""{"tenant_id":"{{TenantA:D}}","permissions":["spaceos.collaboration.view"],"enabled_modules":["spaceos.collaboration"]}""";

        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, raw)), null);

        Assert.Equal(TenantResolutionStatus.InvalidTenantAuthority, result.Status);
    }

    [Fact]
    public void Missing_authority_is_distinct_from_malformed_authority()
    {
        var result = TenantResolver.Resolve(PrincipalWith(new Claim("sub", "someone")), null);

        Assert.Equal(TenantResolutionStatus.NoTenantClaim, result.Status);
    }
}
