using SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;
using SpaceOS.Modules.Ehs.Domain.Aggregates.TrainingRecordAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Contracts;

/// <summary>
/// Repository contract for TrainingRecord aggregate
/// Implementation in Infrastructure layer (Week 3)
/// </summary>
public interface ITrainingRecordRepository
{
    Task<TrainingRecord?> GetByIdAsync(Guid trainingRecordId, Guid tenantId, CancellationToken ct = default);
    Task<List<TrainingRecord>> ListAsync(TrainingRecordFilter filter, Guid tenantId, CancellationToken ct = default);
    Task<List<TrainingRecord>> GetExpiringAsync(Guid tenantId, int daysThreshold = 30, CancellationToken ct = default);
    Task<List<ExpiringTrainingDto>> GetExpiringTrainingsAsync(Guid tenantId, int daysAhead, CancellationToken ct = default);
    Task AddAsync(TrainingRecord record, CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid trainingRecordId, Guid tenantId, CancellationToken ct = default);
}

public record TrainingRecordFilter(
    Guid? EmployeeId = null,
    TrainingStatus? Status = null,
    DateTimeOffset? ExpiresAfter = null,
    DateTimeOffset? ExpiresBefore = null
);
