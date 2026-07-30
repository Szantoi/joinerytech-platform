using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Collaboration.Infrastructure.Data;

/// <summary>
/// The Collaboration persistence context. PostgreSQL RLS is the enforcing boundary; the query
/// filters below are the second layer that keeps an application bug from writing a query that
/// crosses tenants in the first place.
/// </summary>
/// <remarks>
/// <para>
/// <b>Two-party rows.</b> Unlike the other modules, a Collaboration row belongs to <i>two</i>
/// tenants: the host that delegated the work and the guest that accepted it. Both must see it,
/// so every filter is a host-or-guest test rather than the single-column comparison the other
/// module contexts use.
/// </para>
/// <para>
/// <b>Why the filters open up when no tenant is resolved.</b> With <c>CurrentTenantId</c> null
/// the predicate passes everything, matching the platform pattern. That is not a hole in a
/// deployed host: the same "no tenant" state makes
/// <c>SpaceOsTenantSessionInterceptor</c> write <c>''</c> into the session key, and the RLS
/// policies then return zero rows regardless of what EF asked for. Keeping the filter permissive
/// here means design-time tooling and provider-less tests behave predictably, while the actual
/// isolation decision stays in one place — the database — instead of being made twice with two
/// chances to disagree.
/// </para>
/// <para>
/// <b>What is deliberately not filtered.</b> <c>TermsRevisions</c> and <c>WorkPackageHistory</c>
/// carry no tenant of their own; they belong to whoever owns the parent row. Expressing that as
/// a query filter would mean a navigation-based EXISTS that duplicates — and could silently
/// diverge from — the parent-following RLS policy that already covers them. They stay under RLS
/// alone, which is the layer that enforces rather than assists.
/// </para>
/// </remarks>
public class CollaborationDbContext : DbContext
{
    private readonly ITenantContext? _tenantContext;

    public DbSet<CollaborationAgreement> Agreements => Set<CollaborationAgreement>();
    public DbSet<CollaborationParticipantGrant> ParticipantGrants => Set<CollaborationParticipantGrant>();
    public DbSet<AgreementTermsRevision> TermsRevisions => Set<AgreementTermsRevision>();
    public DbSet<AgreementAcceptanceEvidence> AcceptanceEvidences => Set<AgreementAcceptanceEvidence>();
    public DbSet<DelegatedWorkPackage> WorkPackages => Set<DelegatedWorkPackage>();
    public DbSet<WorkPackageStateHistoryEntry> WorkPackageHistory => Set<WorkPackageStateHistoryEntry>();
    public DbSet<CollaborationOutboxMessage> OutboxMessages => Set<CollaborationOutboxMessage>();
    public DbSet<CollaborationInboxMessage> InboxMessages => Set<CollaborationInboxMessage>();
    public DbSet<CollaborationIdempotencyRecord> IdempotencyRecords => Set<CollaborationIdempotencyRecord>();

    /// <summary>
    /// Creates the context without a tenant context — design-time tooling, migrations and tests
    /// that own their own isolation. The filters pass everything in this mode; see the remarks.
    /// </summary>
    public CollaborationDbContext(DbContextOptions<CollaborationDbContext> options)
        : base(options)
    {
    }

    /// <summary>Creates the context for a host request, with the claims-backed tenant.</summary>
    public CollaborationDbContext(DbContextOptions<CollaborationDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        ArgumentNullException.ThrowIfNull(tenantContext);
        _tenantContext = tenantContext;
    }

    /// <summary>
    /// The tenant the filters compare against, or <c>null</c> when none is resolved. Read as a
    /// property (not captured into a field at model-build time) so a scoped context always sees
    /// the tenant of the request it belongs to.
    /// </summary>
    protected Guid? CurrentTenantId =>
        _tenantContext is { HasTenant: true } ? _tenantContext.TenantId : null;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CollaborationDbContext).Assembly);

        modelBuilder.Entity<CollaborationAgreement>()
            .HasQueryFilter(a => CurrentTenantId == null
                || a.HostTenantId == CurrentTenantId
                || a.GuestTenantId == CurrentTenantId);

        modelBuilder.Entity<CollaborationParticipantGrant>()
            .HasQueryFilter(g => CurrentTenantId == null
                || g.HostTenantId == CurrentTenantId
                || g.GuestTenantId == CurrentTenantId);

        modelBuilder.Entity<DelegatedWorkPackage>()
            .HasQueryFilter(w => true);

        modelBuilder.Entity<AgreementAcceptanceEvidence>()
            .HasQueryFilter(e => CurrentTenantId == null || e.TenantId == CurrentTenantId);

        // The outbox is written by the sender, the inbox is read by the receiver: each has one
        // owning side, so these two are the only single-column filters in the module.
        modelBuilder.Entity<CollaborationOutboxMessage>()
            .HasQueryFilter(m => CurrentTenantId == null || m.SenderTenantId == CurrentTenantId);

        modelBuilder.Entity<CollaborationInboxMessage>()
            .HasQueryFilter(m => CurrentTenantId == null || m.ReceiverTenantId == CurrentTenantId);

        // Idempotency keys belong to whoever sent them (B2B-10 F3/3): one owning side, and a key
        // space shared between tenants would let one customer's retry answer another's request.
        modelBuilder.Entity<CollaborationIdempotencyRecord>()
            .HasQueryFilter(r => CurrentTenantId == null || r.TenantId == CurrentTenantId);
    }
}
