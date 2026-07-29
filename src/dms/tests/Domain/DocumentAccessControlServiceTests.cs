using System;
using System.Collections.Generic;
using FluentAssertions;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Services;
using SpaceOS.Modules.DMS.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Domain;

/// <summary>
/// Object-level access control inside a tenant (Codex P1; business owner decision 2026-07-29:
/// fail-closed).
/// </summary>
/// <remarks>
/// RLS keeps tenants apart; these cases are about the question it cannot answer — may this
/// colleague open THIS document. Before this service was implemented, the answer inside a
/// tenant was always yes.
/// </remarks>
public class DocumentAccessControlServiceTests
{
    private static readonly UserId Owner = new(Guid.Parse("11111111-1111-1111-1111-111111111111"));
    private static readonly UserId Colleague = new(Guid.Parse("22222222-2222-2222-2222-222222222222"));
    private static readonly Guid ReviewerRole = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private readonly DocumentAccessControlService _access = new();

    private static Document Owned(UserId? ownerUserId) => Document.Create(
        tenantId: new TenantId(Guid.Parse("44444444-4444-4444-4444-444444444444")),
        name: "Kiviteli terv",
        type: DocType.Drawing,
        linkType: DocLinkType.None,
        linkId: null,
        linkLabel: string.Empty,
        owner: "Kovács Anna",
        note: null,
        fileLabel: "terv-v1.pdf",
        validUntil: null,
        ownerUserId: ownerUserId);

    private static DocumentAccessContext Caller(UserId user, params Guid[] roles) =>
        new(user, new HashSet<Guid>(roles));

    [Fact]
    public void The_owner_may_do_everything()
    {
        var document = Owned(Owner);
        var caller = Caller(Owner);

        _access.CanView(document, caller).Should().BeTrue();
        _access.CanEdit(document, caller).Should().BeTrue();
        _access.CanDelete(document, caller).Should().BeTrue();
        _access.CanShare(document, caller).Should().BeTrue();
    }

    [Fact]
    public void A_colleague_without_a_grant_may_do_nothing()
    {
        // The point of the whole slice: same tenant, so RLS lets the row through — and this is
        // what stops it going any further.
        var document = Owned(Owner);
        var caller = Caller(Colleague);

        _access.CanView(document, caller).Should().BeFalse();
        _access.CanEdit(document, caller).Should().BeFalse();
        _access.CanDelete(document, caller).Should().BeFalse();
        _access.CanShare(document, caller).Should().BeFalse();
    }

    [Theory]
    [InlineData(PermissionType.Edit)]
    [InlineData(PermissionType.Delete)]
    [InlineData(PermissionType.Share)]
    public void A_direct_grant_opens_exactly_the_operation_it_names(PermissionType granted)
    {
        var document = Owned(Owner);
        document.GrantPermission(granted, Colleague, roleId: null, grantedBy: Owner);
        var caller = Caller(Colleague);

        _access.CanEdit(document, caller).Should().Be(granted == PermissionType.Edit);
        _access.CanDelete(document, caller).Should().Be(granted == PermissionType.Delete);
        _access.CanShare(document, caller).Should().Be(granted == PermissionType.Share);
    }

    [Fact]
    public void Any_grant_implies_the_right_to_read()
    {
        // Someone allowed to edit but not to open the document is not a boundary, it is an
        // unusable screen.
        var document = Owned(Owner);
        document.GrantPermission(PermissionType.Edit, Colleague, roleId: null, grantedBy: Owner);

        _access.CanView(document, Caller(Colleague)).Should().BeTrue();
    }

    [Fact]
    public void A_role_grant_reaches_everyone_holding_that_role()
    {
        var document = Owned(Owner);
        document.GrantPermission(PermissionType.Edit, userId: null, roleId: ReviewerRole, grantedBy: Owner);

        _access.CanEdit(document, Caller(Colleague, ReviewerRole)).Should().BeTrue();
    }

    [Fact]
    public void A_role_grant_does_not_reach_someone_outside_the_role()
    {
        var document = Owned(Owner);
        document.GrantPermission(PermissionType.Edit, userId: null, roleId: ReviewerRole, grantedBy: Owner);

        _access.CanEdit(document, Caller(Colleague)).Should().BeFalse();
    }

    [Fact]
    public void A_document_predating_ownership_stays_readable_but_not_writable()
    {
        // The documented transition. Denying these outright would make every existing document
        // vanish for everyone the day this ships — and a rule that loses people their files is
        // a rule that gets switched off.
        var document = Owned(ownerUserId: null);
        var caller = Caller(Colleague);

        _access.CanView(document, caller).Should().BeTrue();
        _access.CanEdit(document, caller).Should().BeFalse();
        _access.CanDelete(document, caller).Should().BeFalse();
        _access.CanShare(document, caller).Should().BeFalse();
    }

    [Fact]
    public void A_grant_still_works_on_a_document_predating_ownership()
    {
        var document = Owned(ownerUserId: null);
        document.GrantPermission(PermissionType.Delete, Colleague, roleId: null, grantedBy: Owner);

        _access.CanDelete(document, Caller(Colleague)).Should().BeTrue();
    }

    [Fact]
    public void Assigning_an_owner_closes_the_transition_for_that_document()
    {
        // Backfilling ownership is what ends the read-for-everyone exception, one document at
        // a time.
        var document = Owned(ownerUserId: null);
        document.AssignOwner(Owner);

        _access.CanView(document, Caller(Colleague)).Should().BeFalse();
        _access.CanView(document, Caller(Owner)).Should().BeTrue();
    }

    [Fact]
    public void An_owner_cannot_be_silently_replaced()
    {
        var document = Owned(Owner);

        var act = () => document.AssignOwner(Colleague);

        act.Should().Throw<Exception>();
    }
}
