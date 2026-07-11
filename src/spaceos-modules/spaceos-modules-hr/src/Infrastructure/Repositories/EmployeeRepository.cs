using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Infrastructure.Data;

namespace SpaceOS.Modules.HR.Infrastructure.Repositories;

/// <summary>
/// EF Core implementation of Employee repository.
/// </summary>
public class EmployeeRepository : IEmployeeRepository
{
    private readonly HrDbContext _context;

    public EmployeeRepository(HrDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <inheritdoc/>
    public async Task<Employee?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.Employees
            .IgnoreQueryFilters()
            .Include(e => e.Competencies)
            .FirstOrDefaultAsync(e => e.Id == id, ct)
            .ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async Task<List<Employee>> GetByTenantIdAsync(Guid tenantId, CancellationToken ct)
    {
        return await _context.Employees
            .IgnoreQueryFilters()
            .Include(e => e.Competencies)
            .Where(e => e.TenantId == tenantId)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async Task AddAsync(Employee employee, CancellationToken ct)
    {
        if (employee == null)
            throw new ArgumentNullException(nameof(employee));

        await _context.Employees.AddAsync(employee, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async Task SaveAsync(Employee employee, CancellationToken ct)
    {
        if (employee == null)
            throw new ArgumentNullException(nameof(employee));

        // Check if entity is already tracked
        var trackedEntity = _context.ChangeTracker.Entries<Employee>()
            .FirstOrDefault(e => e.Entity.Id == employee.Id);

        if (trackedEntity != null)
        {
            // Entity is already tracked, just save changes
            await _context.SaveChangesAsync(ct).ConfigureAwait(false);
        }
        else
        {
            // Entity not tracked, check if exists in DB
            var exists = await _context.Employees
                .AnyAsync(e => e.Id == employee.Id, ct)
                .ConfigureAwait(false);

            if (exists)
            {
                _context.Employees.Update(employee);
            }
            else
            {
                await _context.Employees.AddAsync(employee, ct).ConfigureAwait(false);
            }

            await _context.SaveChangesAsync(ct).ConfigureAwait(false);
        }
    }

    /// <inheritdoc/>
    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var employee = await GetByIdAsync(id, ct).ConfigureAwait(false);
        if (employee != null)
        {
            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync(ct).ConfigureAwait(false);
        }
    }
}
