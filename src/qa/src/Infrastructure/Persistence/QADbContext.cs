using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Infrastructure.Persistence.Configurations;

namespace SpaceOS.Modules.QA.Infrastructure.Persistence;

/// <summary>
/// Entity Framework Core DbContext for QA module.
/// Schema: "qa"
/// </summary>
public class QADbContext : DbContext
{
    public DbSet<QACheckpoint> QACheckpoints { get; set; } = null!;
    public DbSet<Inspection> Inspections { get; set; } = null!;
    public DbSet<Ticket> Tickets { get; set; } = null!;

    public QADbContext(DbContextOptions<QADbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfiguration(new QACheckpointEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new InspectionEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new TicketEntityTypeConfiguration());
    }
}
