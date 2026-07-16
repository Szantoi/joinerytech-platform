using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;
using SpaceOS.Modules.HR.Domain.ValueObjects;

namespace SpaceOS.Modules.HR.Domain.Repositories;

public interface IEmployeeRepository
{
    Task<Employee?> GetByIdAsync(EmployeeId id, CancellationToken ct = default);
    
    Task<Employee?> GetByEmailAsync(TenantId tenantId, string email, CancellationToken ct = default);

    /// <summary>
    /// Lists employees for the tenant with the API's optional filters
    /// (portal contract: dept / q / skill), ordered by name.
    /// </summary>
    Task<IReadOnlyList<Employee>> ListAsync(
        TenantId tenantId,
        Department? department = null,
        SkillKey? skill = null,
        string? searchText = null,
        bool activeOnly = true,
        CancellationToken ct = default);
    
    Task<IEnumerable<Employee>> GetActiveByDepartmentAsync(TenantId tenantId, Department department, CancellationToken ct = default);
    
    Task<IEnumerable<Employee>> GetActiveBySkillAsync(TenantId tenantId, SkillKey skill, CancellationToken ct = default);
    
    Task AddAsync(Employee employee, CancellationToken ct = default);
    
    Task UpdateAsync(Employee employee, CancellationToken ct = default);
}
