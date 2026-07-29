using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data;

public class CollaborationDbContext : DbContext
{
    public DbSet<CollaborationAgreement> Agreements => Set<CollaborationAgreement>();
    public DbSet<CollaborationParticipantGrant> ParticipantGrants => Set<CollaborationParticipantGrant>();
    public DbSet<AgreementTermsRevision> TermsRevisions => Set<AgreementTermsRevision>();
    public DbSet<AgreementAcceptanceEvidence> AcceptanceEvidences => Set<AgreementAcceptanceEvidence>();
    public DbSet<DelegatedWorkPackage> WorkPackages => Set<DelegatedWorkPackage>();
    public DbSet<WorkPackageStateHistoryEntry> WorkPackageHistory => Set<WorkPackageStateHistoryEntry>();
    public DbSet<CollaborationOutboxMessage> OutboxMessages => Set<CollaborationOutboxMessage>();
    public DbSet<CollaborationInboxMessage> InboxMessages => Set<CollaborationInboxMessage>();

    public CollaborationDbContext(DbContextOptions<CollaborationDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CollaborationDbContext).Assembly);
    }
}
