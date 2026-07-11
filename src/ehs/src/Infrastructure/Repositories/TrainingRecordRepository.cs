using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;
using SpaceOS.Modules.Ehs.Domain.Aggregates.TrainingRecordAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for TrainingRecord aggregate.
/// Provides training record listing, expiration tracking, and CRUD operations.
/// Status is computed client-side (Valid/Expiring/Expired based on ExpiresAt).
/// </summary>
public class TrainingRecordRepository : ITrainingRecordRepository
{
    private readonly EhsDbContext _context;

    public TrainingRecordRepository(EhsDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get training record by ID with tenant filtering.
    /// </summary>
    public async Task<TrainingRecord?> GetByIdAsync(Guid trainingRecordId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.TrainingRecords
            .FirstOrDefaultAsync(t => t.TrainingRecordId == trainingRecordId && t.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// List training records with filtering support.
    /// Filters: EmployeeId, Status (client-side), ExpiresAfter, ExpiresBefore
    /// </summary>
    public async Task<List<TrainingRecord>> ListAsync(TrainingRecordFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.TrainingRecords
            .Where(t => t.TenantId == tenantId);

        if (filter.EmployeeId.HasValue)
            query = query.Where(t => t.EmployeeId == filter.EmployeeId.Value);

        if (filter.ExpiresAfter.HasValue)
            query = query.Where(t => t.ExpiresAt >= filter.ExpiresAfter.Value);

        if (filter.ExpiresBefore.HasValue)
            query = query.Where(t => t.ExpiresAt <= filter.ExpiresBefore.Value);

        var records = await query
            .OrderBy(t => t.ExpiresAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        // Filter by Status (computed property - must be done client-side)
        if (filter.Status.HasValue)
        {
            records = records.Where(t => t.Status == filter.Status.Value).ToList();
        }

        return records;
    }

    /// <summary>
    /// Get training records expiring within the specified days threshold.
    /// Default: 30 days (ISO 45001 compliance standard).
    /// </summary>
    public async Task<List<TrainingRecord>> GetExpiringAsync(Guid tenantId, int daysThreshold = 30, CancellationToken ct = default)
    {
        var thresholdDate = DateTimeOffset.UtcNow.AddDays(daysThreshold);

        return await _context.TrainingRecords
            .Where(t => t.TenantId == tenantId &&
                        t.ExpiresAt != null &&
                        t.ExpiresAt <= thresholdDate &&
                        t.ExpiresAt > DateTimeOffset.UtcNow)
            .OrderBy(t => t.ExpiresAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Get expiring trainings with employee details (DTO projection).
    /// Used for notification and dashboard widgets.
    /// </summary>
    public async Task<List<ExpiringTrainingDto>> GetExpiringTrainingsAsync(Guid tenantId, int daysAhead, CancellationToken ct = default)
    {
        var thresholdDate = DateTimeOffset.UtcNow.AddDays(daysAhead);

        var records = await _context.TrainingRecords
            .Where(t => t.TenantId == tenantId &&
                        t.ExpiresAt != null &&
                        t.ExpiresAt <= thresholdDate &&
                        t.ExpiresAt > DateTimeOffset.UtcNow)
            .OrderBy(t => t.ExpiresAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        // Map to DTO with computed DaysUntilExpiry
        return records.Select(t => new ExpiringTrainingDto(
            t.TrainingRecordId,
            t.EmployeeId,
            t.TrainingType,
            t.ExpiresAt!.Value,
            (int)(t.ExpiresAt!.Value - DateTimeOffset.UtcNow).TotalDays
        )).ToList();
    }

    /// <summary>
    /// Add a new training record to the database.
    /// </summary>
    public async Task AddAsync(TrainingRecord record, CancellationToken ct = default)
    {
        await _context.TrainingRecords.AddAsync(record, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Check if a training record exists with the given ID and tenant.
    /// </summary>
    public async Task<bool> ExistsAsync(Guid trainingRecordId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.TrainingRecords
            .AnyAsync(t => t.TrainingRecordId == trainingRecordId && t.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }
}
