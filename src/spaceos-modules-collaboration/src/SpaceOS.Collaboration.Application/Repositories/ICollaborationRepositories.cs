using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.Repositories;

/// <summary>
/// Loads and persists <see cref="DelegatedWorkPackage"/> aggregates.
/// </summary>
/// <remarks>
/// The abstraction lives here and the EF implementation in Infrastructure so that the DbContext
/// never reaches a handler (B2B-10 F1). A handler that could query freely would sooner or later
/// enforce a rule with a `Where`, and the aggregate would stop being the single place the rules
/// live.
/// </remarks>
public interface IWorkPackageRepository
{
    /// <summary>Loads one work package with its state history; null when it does not exist.</summary>
    Task<DelegatedWorkPackage?> GetByIdAsync(Guid workPackageId, CancellationToken cancellationToken = default);

    /// <summary>Adds a new work package.</summary>
    Task AddAsync(DelegatedWorkPackage workPackage, CancellationToken cancellationToken = default);

    /// <summary>
    /// The project the agreement's existing packages are anchored to, or <c>null</c> when none
    /// of them carries an anchor (B2B-10 F5/1).
    /// </summary>
    /// <remarks>
    /// A FACT for <see cref="DelegatedWorkPackage.EnsureSameProject"/>, not a rule: packages are
    /// separate aggregates, so the one-agreement-one-project invariant needs the siblings'
    /// project handed in, and only the persistence layer can look across them. Anchor-less
    /// legacy packages do not constrain anything — they have no project to disagree with.
    /// </remarks>
    Task<Guid?> GetDelegatedProjectIdAsync(Guid agreementId, CancellationToken cancellationToken = default);

    /// <summary>Persists pending changes of loaded aggregates.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Loads and persists <see cref="CollaborationAgreement"/> aggregates.
/// </summary>
public interface IAgreementRepository
{
    /// <summary>Loads one agreement with its grants and state history; null when it does not exist.</summary>
    Task<CollaborationAgreement?> GetByIdAsync(Guid agreementId, CancellationToken cancellationToken = default);

    /// <summary>Adds a new agreement.</summary>
    Task AddAsync(CollaborationAgreement agreement, CancellationToken cancellationToken = default);

    /// <summary>Persists pending changes of loaded aggregates.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
