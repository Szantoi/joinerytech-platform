using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Application.Concurrency;
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
        => ConcurrencyTranslation.SaveAsync(database, cancellationToken);
}

/// <summary>EF-backed <see cref="IAgreementRepository"/>.</summary>
/// <remarks>
/// Grants come along because authorization reads them (B2B-10 F3): an agreement loaded without
/// them would report "no grant" for a guest that holds one, and fail-closed silently.
/// The state history comes along for the reason spelled out on the work-package repository —
/// and because the interface has promised it since F1 while the query did not deliver it.
/// </remarks>
public sealed class AgreementRepository(CollaborationDbContext database) : IAgreementRepository
{
    public Task<CollaborationAgreement?> GetByIdAsync(Guid agreementId, CancellationToken cancellationToken = default)
        => database.Agreements
            .Include(agreement => agreement.Grants)
            .Include(agreement => agreement.History)
            .FirstOrDefaultAsync(agreement => agreement.Id == agreementId, cancellationToken);

    public async Task AddAsync(CollaborationAgreement agreement, CancellationToken cancellationToken = default)
        => await database.Agreements.AddAsync(agreement, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => ConcurrencyTranslation.SaveAsync(database, cancellationToken);
}

/// <summary>
/// Translates EF's lost-update signal into the application's vocabulary (B2B-10 F3/3).
/// </summary>
/// <remarks>
/// <para>
/// The concurrency tokens have been in place since F2/4, but nothing above the persistence layer
/// could name what they produce: <c>DbUpdateConcurrencyException</c> is an Entity Framework type,
/// and neither the application layer nor the API references Entity Framework. The failure would
/// therefore have travelled all the way to the generic 500 handler — a lost update reported as a
/// server fault, with the client given no reason to retry.
/// </para>
/// <para>
/// Translating HERE rather than referencing EF from the API is the point: the persistence detail
/// stops at the boundary that owns it.
/// </para>
/// </remarks>
internal static class ConcurrencyTranslation
{
    public static async Task SaveAsync(CollaborationDbContext database, CancellationToken cancellationToken)
    {
        try
        {
            await database.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new CollaborationConcurrencyConflictException(
                "The collaboration aggregate was modified by another writer before this change could be saved.",
                exception);
        }
    }
}
