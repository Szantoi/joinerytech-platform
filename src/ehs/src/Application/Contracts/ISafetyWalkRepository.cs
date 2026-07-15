using SpaceOS.Modules.Ehs.Domain.Aggregates.SafetyWalkAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Contracts;

/// <summary>
/// Repository contract for SafetyWalk aggregate (munkavédelmi bejárás, FSM).
/// Implementation in Infrastructure layer.
/// </summary>
public interface ISafetyWalkRepository
{
    /// <summary>Loads the walk including its findings</summary>
    Task<SafetyWalk?> GetByIdAsync(Guid safetyWalkId, Guid tenantId, CancellationToken ct = default);

    Task<List<SafetyWalk>> ListAsync(SafetyWalkFilter filter, Guid tenantId, CancellationToken ct = default);
    Task AddAsync(SafetyWalk walk, CancellationToken ct = default);
    Task UpdateAsync(SafetyWalk walk, CancellationToken ct = default);
}

/// <summary>Filter for safety walk listing</summary>
public record SafetyWalkFilter(
    Guid? LocationId = null,
    SafetyWalkStatus? Status = null,
    DateTimeOffset? ScheduledAfter = null,
    DateTimeOffset? ScheduledBefore = null
);
