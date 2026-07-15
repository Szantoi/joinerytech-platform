using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Contracts;

/// <summary>
/// Repository contract for PpeIssuance aggregate (PPE hand-outs, FSM).
/// Implementation in Infrastructure layer.
/// </summary>
public interface IPpeIssuanceRepository
{
    Task<PpeIssuance?> GetByIdAsync(Guid issuanceId, Guid tenantId, CancellationToken ct = default);
    Task<List<PpeIssuance>> ListAsync(PpeIssuanceFilter filter, Guid tenantId, CancellationToken ct = default);
    Task AddAsync(PpeIssuance issuance, CancellationToken ct = default);
    Task UpdateAsync(PpeIssuance issuance, CancellationToken ct = default);

    /// <summary>
    /// Persist a replacement atomically: the replaced (old) issuance update and
    /// the new issuance insert happen in a single SaveChanges.
    /// </summary>
    Task AddReplacementAsync(PpeIssuance replaced, PpeIssuance replacement, CancellationToken ct = default);
}

/// <summary>
/// Filter for PPE issuance listing.
/// ExpiringWithinDays keeps only outstanding (Issued/Acknowledged) issuances
/// whose ExpiresAt falls within the window — the "lejart/lejaro" dashboard view.
/// </summary>
public record PpeIssuanceFilter(
    Guid? EmployeeId = null,
    PpeIssuanceStatus? Status = null,
    int? ExpiringWithinDays = null
);
