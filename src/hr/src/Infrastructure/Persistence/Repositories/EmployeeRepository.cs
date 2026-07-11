using Microsoft.EntityFrameworkCore;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Domain.StrongIds;
using SpaceOS.Modules.HR.Domain.ValueObjects;

namespace SpaceOS.Modules.HR.Infrastructure.Persistence.Repositories;

/// <summary>
/// Employee repository implementation with RLS multi-tenancy support.
/// Implements hybrid pattern: RLS-native for ID lookups, explicit tenantId for broad queries
/// (HR Week 3 pattern validation)
/// </summary>
public class EmployeeRepository : IEmployeeRepository
{
    private readonly HRDbContext _context;

    public EmployeeRepository(HRDbContext context)
    {
        _context = context;
    }

    // ⚠️ CRITICAL: Hybrid pattern
    // - GetByIdAsync(id, ct): 2-param — RLS handles tenant isolation
    // - GetByEmailAsync(tenantId, email, ct): 3-param — explicit tenant scoping for broad query
    // - GetActiveByDepartmentAsync(tenantId, dept, ct): 3-param — explicit tenant scoping

    public async Task<Employee?> GetByIdAsync(EmployeeId id, CancellationToken ct = default)
    {
        return await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == id, ct)
            .ConfigureAwait(false);
    }

    public async Task<Employee?> GetByEmailAsync(
        TenantId tenantId,
        string email,
        CancellationToken ct = default)
    {
        return await _context.Employees
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Email == email, ct)
            .ConfigureAwait(false);
    }

    public async Task<IEnumerable<Employee>> GetActiveByDepartmentAsync(
        TenantId tenantId,
        Department department,
        CancellationToken ct = default)
    {
        return await _context.Employees
            .Where(e => e.TenantId == tenantId && e.Department == department && e.Active)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<IEnumerable<Employee>> GetActiveBySkillAsync(
        TenantId tenantId,
        SkillKey skill,
        CancellationToken ct = default)
    {
        return await _context.Employees
            .Where(e => e.TenantId == tenantId && e.Active && e.Skills.Any(s => s.Key == skill))
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(Employee employee, CancellationToken ct = default)
    {
        await _context.Employees.AddAsync(employee, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task UpdateAsync(Employee employee, CancellationToken ct = default)
    {
        _context.Employees.Update(employee);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
