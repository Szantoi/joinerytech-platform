namespace SpaceOS.Collaboration.Application.Projections;

/// <summary>
/// The read-side facts an agreement view needs from outside its own aggregate (B2B-10 F3/4).
/// </summary>
/// <remarks>
/// <para>
/// Deliberately not methods on <c>IAgreementRepository</c>: that interface loads and saves
/// aggregates, and a count of somebody else's rows is not part of loading one. Keeping the read
/// side separate is also what stops a handler from "just adding a Where" to a repository query and
/// quietly moving a rule out of the domain.
/// </para>
/// <para>
/// These two are exactly the fields F1 refused to guess at when it decided a command returns the
/// new status rather than a half-filled projection: the terms hash lives on the revision, and the
/// open-package count on a different aggregate entirely.
/// </para>
/// </remarks>
public interface IAgreementViewQueries
{
    /// <summary>The canonical hash of a terms revision, or <c>null</c> if there is no such revision.</summary>
    Task<string?> GetTermsHashAsync(Guid termsRevisionId, CancellationToken cancellationToken = default);

    /// <summary>How many of the agreement's work packages are still in play.</summary>
    Task<int> CountOpenWorkPackagesAsync(Guid agreementId, CancellationToken cancellationToken = default);
}
