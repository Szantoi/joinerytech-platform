using System;
using System.Collections.Generic;
using System.Linq;
using FluentAssertions;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Services;
using SpaceOS.Modules.DMS.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Domain;

/// <summary>
/// The visibility rule exists twice — as an in-memory check and as a translatable query — and
/// these cases exist so it can only ever mean one thing.
/// </summary>
/// <remarks>
/// The duplication is unavoidable: a list has to be filtered by the database (post-filtering
/// breaks paging and reads the whole tenant), while a single loaded document is checked in
/// memory. What is avoidable is the two drifting apart, which is why every case below is run
/// through BOTH and compared. A change to one that is not mirrored in the other fails here —
/// not in production, where the symptom would be "the list shows a document the detail page
/// then refuses to open".
/// </remarks>
public class DocumentAccessRuleParityTests
{
    private static readonly UserId Owner = new(Guid.Parse("11111111-1111-1111-1111-111111111111"));
    private static readonly UserId Colleague = new(Guid.Parse("22222222-2222-2222-2222-222222222222"));
    private static readonly Guid ReviewerRole = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid OtherRole = Guid.Parse("44444444-4444-4444-4444-444444444444");

    private readonly DocumentAccessControlService _inMemory = new();

    private static Document Document_(UserId? owner) => Document.Create(
        new TenantId(Guid.NewGuid()),
        name: "Terv",
        type: DocType.Drawing,
        linkType: DocLinkType.None,
        linkId: null,
        linkLabel: string.Empty,
        owner: "Szabó Anna",
        note: null,
        fileLabel: "terv.pdf",
        validUntil: null,
        ownerUserId: owner);

    private static (Document Document, DocumentAccessContext Caller) Build(string scenario)
    {
        switch (scenario)
        {
            case "owner":
                return (Document_(Owner), new DocumentAccessContext(Owner));

            case "stranger":
                return (Document_(Owner), new DocumentAccessContext(Colleague));

            case "direct-view-grant":
            {
                var document = Document_(Owner);
                document.GrantPermission(PermissionType.View, Colleague, null, Owner);
                return (document, new DocumentAccessContext(Colleague));
            }

            case "direct-edit-grant":
            {
                var document = Document_(Owner);
                document.GrantPermission(PermissionType.Edit, Colleague, null, Owner);
                return (document, new DocumentAccessContext(Colleague));
            }

            case "role-grant-held":
            {
                var document = Document_(Owner);
                document.GrantPermission(PermissionType.View, null, ReviewerRole, Owner);
                return (document, new DocumentAccessContext(Colleague, new HashSet<Guid> { ReviewerRole }));
            }

            case "role-grant-not-held":
            {
                var document = Document_(Owner);
                document.GrantPermission(PermissionType.View, null, ReviewerRole, Owner);
                return (document, new DocumentAccessContext(Colleague, new HashSet<Guid> { OtherRole }));
            }

            case "legacy-no-owner":
                return (Document_(null), new DocumentAccessContext(Colleague));

            default:
                throw new ArgumentOutOfRangeException(nameof(scenario), scenario, "Unknown case.");
        }
    }

    [Theory]
    [InlineData("owner")]
    [InlineData("stranger")]
    [InlineData("direct-view-grant")]
    [InlineData("direct-edit-grant")]
    [InlineData("role-grant-held")]
    [InlineData("role-grant-not-held")]
    [InlineData("legacy-no-owner")]
    public void The_query_form_and_the_in_memory_form_agree(string scenario)
    {
        var (document, caller) = Build(scenario);

        var inMemory = _inMemory.CanView(document, caller);

        // The predicate compiled and run over a one-element sequence: the same expression the
        // database receives, evaluated here so the comparison needs no infrastructure.
        var asQuery = new[] { document }.AsQueryable()
            .Where(DocumentAccessSpecification.Visible(caller))
            .Any();

        asQuery.Should().Be(
            inMemory,
            $"a(z) '{scenario}' esetben a lista-szűrés és az egyedi ellenőrzés nem mondhat mást");
    }
}
