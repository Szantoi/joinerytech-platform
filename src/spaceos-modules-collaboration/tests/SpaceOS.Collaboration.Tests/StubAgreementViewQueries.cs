using SpaceOS.Collaboration.Application.Projections;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// The two out-of-aggregate facts of the agreement view, supplied by the test.
/// </summary>
/// <remarks>
/// <b>What this can prove:</b> that the endpoint assembles and returns the view, and that a
/// non-party never gets one. <b>What it cannot:</b> that the real queries read the right rows under
/// the tenant filters and RLS — that is measured against PostgreSQL in
/// <c>AgreementViewQueryTests</c>. The split is deliberate; a stub asserted as if it were the query
/// would be a mirror.
/// </remarks>
internal sealed class StubAgreementViewQueries(string? termsHash = null, int openWorkPackages = 0)
    : IAgreementViewQueries
{
    public Task<string?> GetTermsHashAsync(Guid termsRevisionId, CancellationToken cancellationToken = default)
        => Task.FromResult(termsHash);

    public Task<int> CountOpenWorkPackagesAsync(Guid agreementId, CancellationToken cancellationToken = default)
        => Task.FromResult(openWorkPackages);
}
