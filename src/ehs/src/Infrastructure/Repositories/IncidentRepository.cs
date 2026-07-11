using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for Incident aggregate.
/// Provides incident listing, filtering, aggregations (summary, trends), and CRUD operations.
/// </summary>
public class IncidentRepository : IIncidentRepository
{
    private readonly EhsDbContext _context;

    public IncidentRepository(EhsDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get incident by ID with tenant filtering and owned entities loaded.
    /// </summary>
    public async Task<Incident?> GetByIdAsync(Guid incidentId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Incidents
            .FirstOrDefaultAsync(i => i.IncidentId == incidentId && i.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// List incidents with filtering support.
    /// Filters: Type, Status, Date range, Min Severity
    /// </summary>
    public async Task<List<Incident>> ListAsync(IncidentFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.Incidents
            .Where(i => i.TenantId == tenantId);

        if (filter.Type.HasValue)
            query = query.Where(i => i.IncidentType == filter.Type.Value);

        if (filter.Status.HasValue)
            query = query.Where(i => i.Status == filter.Status.Value);

        if (filter.OccurredAfter.HasValue)
            query = query.Where(i => i.IncidentDate >= filter.OccurredAfter.Value);

        if (filter.OccurredBefore.HasValue)
            query = query.Where(i => i.IncidentDate <= filter.OccurredBefore.Value);

        if (filter.MinSeverity.HasValue)
            query = query.Where(i => i.Severity >= filter.MinSeverity.Value);

        return await query
            .OrderByDescending(i => i.IncidentDate)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Get incident aggregation summary: Total, ByType, BySeverity, ByStatus
    /// Returns IncidentSummary (with enum dictionaries)
    /// </summary>
    public async Task<IncidentSummary> GetSummaryAsync(Guid tenantId, CancellationToken ct = default)
    {
        var incidents = await _context.Incidents
            .Where(i => i.TenantId == tenantId)
            .Select(i => new { i.IncidentType, i.Severity, i.Status })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var total = incidents.Count;

        var byType = incidents
            .GroupBy(i => i.IncidentType)
            .ToDictionary(g => g.Key, g => g.Count());

        var bySeverity = incidents
            .GroupBy(i => i.Severity)
            .ToDictionary(g => g.Key, g => g.Count());

        var byStatus = incidents
            .GroupBy(i => i.Status)
            .ToDictionary(g => g.Key, g => g.Count());

        return new IncidentSummary(total, byType, bySeverity, byStatus);
    }

    /// <summary>
    /// Get incident trends (monthly counts) for the last N months.
    /// Returns IncidentTrendsDto with monthly breakdown by type.
    /// </summary>
    public async Task<IncidentTrendsDto> GetTrendsAsync(Guid tenantId, int monthsBack, CancellationToken ct = default)
    {
        var startDate = DateTimeOffset.UtcNow.AddMonths(-monthsBack);

        var incidents = await _context.Incidents
            .Where(i => i.TenantId == tenantId && i.IncidentDate >= startDate)
            .Select(i => new { i.IncidentDate, i.IncidentType })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var monthlyCounts = incidents
            .GroupBy(i => new { Year = i.IncidentDate.Year, Month = i.IncidentDate.Month })
            .Select(g => new MonthlyIncidentCount(
                g.Key.Year,
                g.Key.Month,
                g.Count(),
                g.GroupBy(x => x.IncidentType.ToString())
                    .ToDictionary(typeGroup => typeGroup.Key, typeGroup => typeGroup.Count())
            ))
            .OrderBy(m => m.Year)
            .ThenBy(m => m.Month)
            .ToList();

        return new IncidentTrendsDto(monthlyCounts);
    }

    /// <summary>
    /// Add a new incident to the database.
    /// </summary>
    public async Task AddAsync(Incident incident, CancellationToken ct = default)
    {
        await _context.Incidents.AddAsync(incident, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Update an existing incident.
    /// </summary>
    public async Task UpdateAsync(Incident incident, CancellationToken ct = default)
    {
        _context.Incidents.Update(incident);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Check if an incident exists with the given ID and tenant.
    /// </summary>
    public async Task<bool> ExistsAsync(Guid incidentId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Incidents
            .AnyAsync(i => i.IncidentId == incidentId && i.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }
}
