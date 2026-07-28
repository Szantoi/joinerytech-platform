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
    public void Snake_case_tenant_list_claim_resolves_the_tenant()
    {
        var listJson = $$"""[{"tenant_id":"{{TenantA}}","enabled_modules":["spaceos.maintenance"]}]""";

        var result = TenantResolver.Resolve(
            PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, listJson)), null);

        Assert.Equal(TenantResolutionStatus.Resolved, result.Status);
        Assert.Equal(TenantA, result.TenantId);
    }

    [Fact]
    public void Enabled_modules_are_read_only_from_the_resolved_tenant_entry()
    {
        var listJson = "[{\"tenant_id\":\"" + TenantA +
                       "\",\"enabled_modules\":[\"spaceos.maintenance\",\"maintenance\"]}," +
                       "{\"tenant_id\":\"" + TenantB +
                       "\",\"enabled_modules\":[\"spaceos.qa\"]}]";
        var principal = PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, listJson));

        var modules = TenantResolver.GetEnabledModules(principal, TenantA);

        Assert.Contains("spaceos.maintenance", modules);
        Assert.DoesNotContain("maintenance", modules);
        Assert.DoesNotContain("spaceos.qa", modules);
    }

    [Fact]
    public void Missing_or_malformed_module_claim_never_grants_access()
    {
        var noClaim = TenantResolver.GetEnabledModules(
            PrincipalWith(new Claim(TenancyDefaults.TenantIdClaim, TenantA.ToString())), TenantA);
        var malformedClaim = TenantResolver.GetEnabledModules(
            PrincipalWith(
                new Claim(TenancyDefaults.TenantIdClaim, TenantA.ToString()),
                new Claim(TenancyDefaults.EnabledModulesClaim, "{not json[")), TenantA);

        Assert.Empty(noClaim);
        Assert.Empty(malformedClaim);
    }

    [Fact]
    public void Flat_enabled_modules_claim_is_a_migration_fallback_and_canonicalized()
    {
        var modules = TenantResolver.GetEnabledModules(
            PrincipalWith(
                new Claim(TenancyDefaults.TenantIdClaim, TenantA.ToString()),
                new Claim(TenancyDefaults.EnabledModulesClaim, "[\"spaceos.maintenance\",\"maintenance\"]")),
            TenantA);

        Assert.Equal(new[] { "spaceos.maintenance" }, modules);
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
    public void String_wrapped_snake_case_keycloak_entry_is_authoritative_for_modules()
    {
        var wrapped = System.Text.Json.JsonSerializer.Serialize(
            $$"""[{"tenant_id":"{{TenantA}}","enabled_modules":["spaceos.maintenance"]}]""");
        var principal = PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, wrapped));

        var resolution = TenantResolver.Resolve(principal, null);
        var modules = TenantResolver.GetEnabledModules(principal, TenantA);

        Assert.Equal(TenantResolutionStatus.Resolved, resolution.Status);
        Assert.Equal(TenantA, resolution.TenantId);
        Assert.Equal(new[] { "spaceos.maintenance" }, modules);
    }

    [Fact]
    public void Snake_case_entry_fields_take_precedence_over_legacy_aliases()
    {
        var listJson = "[{\"tenant_id\":\"" + TenantA +
                       "\",\"tenantId\":\"" + TenantB +
                       "\",\"enabled_modules\":[\"spaceos.maintenance\"]" +
                       ",\"enabledModules\":[\"spaceos.qa\"]}]";
        var principal = PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, listJson));

        var modules = TenantResolver.GetEnabledModules(principal, TenantA);

        Assert.Equal(new[] { "spaceos.maintenance" }, modules);
        Assert.Empty(TenantResolver.GetEnabledModules(principal, TenantB));
    }

    [Fact]
    public void Duplicate_entries_for_the_same_tenant_fail_closed()
    {
        var listJson = "[{\"tenant_id\":\"" + TenantA + "\",\"enabled_modules\":[\"spaceos.maintenance\"]}," +
                       "{\"tenant_id\":\"" + TenantA + "\",\"enabled_modules\":[\"spaceos.qa\"]}]";
        var principal = PrincipalWith(new Claim(TenancyDefaults.TenantListClaim, listJson));

        Assert.Empty(TenantResolver.GetEnabledModules(principal, TenantA));
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
