using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Collaboration.Infrastructure.Data;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// Every tenant-scoped entity still HAS a tenant query filter (B2B-10 F3/5).
/// </summary>
/// <remarks>
/// <para>
/// Written after a filter went missing and nothing noticed. During the F3/5 layer experiments a
/// restore bug of mine left <c>DelegatedWorkPackage</c>'s filter disabled in the working tree, and
/// the full suite — 218 unit and 46 integration tests — stayed green through it, because row-level
/// security caught every case the filter would have. Defence in depth means exactly that: the
/// layers cover for each other, and therefore <b>a missing layer is invisible behaviourally</b>.
/// </para>
/// <para>
/// So this test does not ask what happens; it asks what is <i>there</i>. It is the same kind of
/// structural check as the endpoint-metadata one, for the same reason: a behavioural test cannot
/// see a defence that another defence is currently making unnecessary.
/// </para>
/// </remarks>
public class TenantQueryFilterPresenceTests
{
    private static CollaborationDbContext BuildContext()
    {
        var options = new DbContextOptionsBuilder<CollaborationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CollaborationDbContext(options);
    }

    public static TheoryData<Type> TenantScopedEntities() =>
    [
        typeof(CollaborationAgreement),
        typeof(CollaborationParticipantGrant),
        typeof(DelegatedWorkPackage),
        typeof(AgreementAcceptanceEvidence),
        typeof(CollaborationOutboxMessage),
        typeof(CollaborationInboxMessage),
        typeof(CollaborationIdempotencyRecord)
    ];

    [Theory]
    [MemberData(nameof(TenantScopedEntities))]
    public void The_entity_carries_a_tenant_query_filter(Type entityType)
    {
        using var context = BuildContext();

        var filter = context.Model.FindEntityType(entityType)?.GetQueryFilter();

        Assert.NotNull(filter);

        // A filter of "w => true" is a filter as far as EF is concerned, and that is precisely what
        // the accident left behind — so the expression has to mention the tenant, not merely exist.
        Assert.Contains(
            "CurrentTenantId",
            filter!.ToString(),
            StringComparison.Ordinal);
    }

    [Fact]
    public void The_two_deliberately_unfiltered_children_are_named_here_rather_than_forgotten()
    {
        // Terms revisions and work-package history carry no tenant of their own; they belong to
        // whoever owns the parent row, and the parent-following RLS policy is what covers them.
        // Listing them keeps "no filter" a decision rather than an oversight.
        using var context = BuildContext();

        Assert.Null(context.Model.FindEntityType(typeof(AgreementTermsRevision))?.GetQueryFilter());
        Assert.Null(context.Model.FindEntityType(typeof(WorkPackageStateHistoryEntry))?.GetQueryFilter());
    }
}
