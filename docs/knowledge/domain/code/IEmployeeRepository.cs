namespace JoineryTech.HR.Domain.Repositories;

using JoineryTech.HR.Domain.Aggregates;
using JoineryTech.HR.Domain.ValueObjects;
using JoineryTech.HR.Domain.Enums;
using JoineryTech.SharedKernel;

/// <summary>
/// Repository contract for Employee aggregate
/// </summary>
public interface IEmployeeRepository
{
    // ============ QUERIES ============

    /// <summary>
    /// Get employee by ID (with RLS enforcement)
    /// </summary>
    Task<Employee?> GetByIdAsync(EmployeeId id, CancellationToken ct = default);

    /// <summary>
    /// Get all active employees (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<Employee>> GetActiveEmployeesAsync(CancellationToken ct = default);

    /// <summary>
    /// Get employees by department (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<Employee>> GetByDepartmentAsync(Department department, CancellationToken ct = default);

    /// <summary>
    /// Get employees by skill (with RLS enforcement)
    /// Optionally filter by minimum skill level
    /// </summary>
    Task<IEnumerable<Employee>> GetBySkillAsync(SkillKey skill, SkillLevel? minLevel = null, CancellationToken ct = default);

    /// <summary>
    /// Get paged employees with optional filters (with RLS enforcement)
    /// </summary>
    Task<PagedResult<Employee>> GetPagedAsync(
        int page,
        int pageSize,
        Department? departmentFilter = null,
        bool? activeFilter = null,
        CancellationToken ct = default);

    // ============ COMMANDS ============

    /// <summary>
    /// Add new employee (domain events not persisted here - use event bus)
    /// </summary>
    Task AddAsync(Employee employee, CancellationToken ct = default);

    /// <summary>
    /// Update existing employee (domain events not persisted here - use event bus)
    /// </summary>
    Task UpdateAsync(Employee employee, CancellationToken ct = default);

    // ============ VALIDATION ============

    /// <summary>
    /// Check if email already exists for this tenant (unique constraint)
    /// </summary>
    Task<bool> EmailExistsAsync(Email email, TenantId tenantId, CancellationToken ct = default);

    // ============ AGGREGATE LOADING ============

    /// <summary>
    /// Get employee by ID with all child entities loaded (Skills, PersonalData)
    /// Use when full aggregate is needed (e.g., vacation balance calculation, personal data update)
    /// </summary>
    Task<Employee?> GetByIdWithDetailsAsync(EmployeeId id, CancellationToken ct = default);
}
