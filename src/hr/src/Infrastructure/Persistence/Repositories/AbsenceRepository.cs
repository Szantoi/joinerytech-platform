using Microsoft.EntityFrameworkCore;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Infrastructure.Persistence.Repositories;

/// <summary>
/// Absence repository implementation with RLS multi-tenancy support.
/// Implements hybrid pattern: RLS-native for ID lookups, explicit tenantId for broad queries
/// (HR Week 3 pattern validation)
/// </summary>
public class AbsenceRepository : IAbsenceRepository
{
    private readonly HRDbContext _context;

    public AbsenceRepository(HRDbContext context)
    {
        _context = context;
    }

    // ⚠️ CRITICAL: Hybrid pattern
    // - GetByIdAsync(id, ct): 2-param — RLS handles tenant isolation
    // - GetByEmployeeAndYearAsync(employeeId, year, ct): 2-param — EmployeeId provides implicit tenant scoping via FK
    // - GetPendingAsync(tenantId, ct): 3-param — explicit tenant scoping for broad query
    // - GetActiveAbsencesAsync(tenantId, date, ct): 3-param — explicit tenant scoping

    public async Task<Absence?> GetByIdAsync(AbsenceId id, CancellationToken ct = default)
    {
        return await _context.Absences
            .FirstOrDefaultAsync(a => a.Id == id, ct)
            .ConfigureAwait(false);
    }

    public async Task<IEnumerable<Absence>> GetByEmployeeAndYearAsync(
        EmployeeId employeeId,
        int year,
        CancellationToken ct = default)
    {
        return await _context.Absences
            .Where(a => a.EmployeeId == employeeId && a.StartDate.Year == year)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<IEnumerable<Absence>> GetPendingAsync(
        TenantId tenantId,
        CancellationToken ct = default)
    {
        return await _context.Absences
            .Where(a => a.TenantId == tenantId && a.Status == AbsenceStatus.Pending)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<IEnumerable<Absence>> GetActiveAbsencesAsync(
        TenantId tenantId,
        DateOnly date,
        CancellationToken ct = default)
    {
        return await _context.Absences
            .Where(a => a.TenantId == tenantId &&
                   a.Status == AbsenceStatus.InProgress &&
                   a.StartDate <= date &&
                   a.EndDate >= date)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(Absence absence, CancellationToken ct = default)
    {
        await _context.Absences.AddAsync(absence, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task UpdateAsync(Absence absence, CancellationToken ct = default)
    {
        _context.Absences.Update(absence);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
