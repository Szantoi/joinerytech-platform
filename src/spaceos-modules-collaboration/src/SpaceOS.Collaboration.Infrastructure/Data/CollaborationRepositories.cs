using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Infrastructure.Data;

/// <summary>EF-backed <see cref="IWorkPackageRepository"/>.</summary>
/// <remarks>
/// The state history is included on every load: a transition writes into it, and an aggregate
/// loaded without its history would silently start a new one — losing the audit trail that is
/// half the point of a two-tenant work package.
/// </remarks>
public sealed class WorkPackageRepository(CollaborationDbContext database) : IWorkPackageRepository
{
    public Task<DelegatedWorkPackage?> GetByIdAsync(Guid workPackageId, CancellationToken cancellationToken = default)
        => database.WorkPackages
            .Include(package => package.History)
            .FirstOrDefaultAsync(package => package.Id == workPackageId, cancellationToken);

    public async Task AddAsync(DelegatedWorkPackage workPackage, CancellationToken cancellationToken = default)
        => await database.WorkPackages.AddAsync(workPackage, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => database.SaveChangesAsync(cancellationToken);
}

/// <summary>EF-backed <see cref="IAgreementRepository"/>.</summary>
public sealed class AgreementRepository(CollaborationDbContext database) : IAgreementRepository
{
    public Task<CollaborationAgreement?> GetByIdAsync(Guid agreementId, CancellationToken cancellationToken = default)
        => database.Agreements
            .Include(agreement => agreement.Grants)
            .FirstOrDefaultAsync(agreement => agreement.Id == agreementId, cancellationToken);

    public async Task AddAsync(CollaborationAgreement agreement, CancellationToken cancellationToken = default)
        => await database.Agreements.AddAsync(agreement, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => database.SaveChangesAsync(cancellationToken);
}
