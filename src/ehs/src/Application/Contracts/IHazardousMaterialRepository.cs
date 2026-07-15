using SpaceOS.Modules.Ehs.Domain.Aggregates.HazardousMaterialAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Contracts;

/// <summary>
/// Repository contract for HazardousMaterial aggregate (SDS registry).
/// Implementation in Infrastructure layer.
/// </summary>
public interface IHazardousMaterialRepository
{
    Task<HazardousMaterial?> GetByIdAsync(Guid materialId, Guid tenantId, CancellationToken ct = default);
    Task<List<HazardousMaterial>> ListAsync(MaterialFilter filter, Guid tenantId, CancellationToken ct = default);

    /// <summary>Active materials whose SDS expires within the given window (dashboard)</summary>
    Task<List<HazardousMaterial>> ListExpiringSdsAsync(int withinDays, Guid tenantId, CancellationToken ct = default);

    Task AddAsync(HazardousMaterial material, CancellationToken ct = default);
    Task UpdateAsync(HazardousMaterial material, CancellationToken ct = default);
}

/// <summary>
/// Filter for hazardous material listing.
/// Validity is a calculated status — the repository translates it to date ranges.
/// </summary>
public record MaterialFilter(
    MaterialStatus? Status = null,
    Guid? LocationId = null,
    SdsValidity? Validity = null
);
