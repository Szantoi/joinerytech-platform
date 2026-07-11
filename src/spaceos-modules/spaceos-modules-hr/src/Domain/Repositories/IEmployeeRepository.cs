using SpaceOS.Modules.HR.Domain.Aggregates;

namespace SpaceOS.Modules.HR.Domain.Repositories;

/// <summary>
/// Repository interface for Employee aggregate.
/// </summary>
public interface IEmployeeRepository
{
    /// <summary>
    /// Gets an employee by ID.
    /// </summary>
    Task<Employee?> GetByIdAsync(Guid id, CancellationToken ct);

    /// <summary>
    /// Gets employees by tenant ID.
    /// </summary>
    Task<List<Employee>> GetByTenantIdAsync(Guid tenantId, CancellationToken ct);

    /// <summary>
    /// Adds a new employee.
    /// </summary>
    Task AddAsync(Employee employee, CancellationToken ct);

    /// <summary>
    /// Saves changes to an existing employee.
    /// </summary>
    Task SaveAsync(Employee employee, CancellationToken ct);

    /// <summary>
    /// Deletes an employee.
    /// </summary>
    Task DeleteAsync(Guid id, CancellationToken ct);
}
