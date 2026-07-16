using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Repositories;

public interface IAbsenceRepository
{
    Task<Absence?> GetByIdAsync(AbsenceId id, CancellationToken ct = default);
    
    Task<IEnumerable<Absence>> GetByEmployeeAndYearAsync(EmployeeId employeeId, int year, CancellationToken ct = default);
    
    Task<IEnumerable<Absence>> GetPendingAsync(TenantId tenantId, CancellationToken ct = default);

    /// <summary>
    /// Lists absences for the tenant with the API's optional filters
    /// (portal contract: status / empId), newest request first.
    /// </summary>
    Task<IReadOnlyList<Absence>> ListAsync(
        TenantId tenantId,
        AbsenceStatus? status = null,
        EmployeeId? employeeId = null,
        CancellationToken ct = default);

    /// <summary>
    /// Absences overlapping the given (inclusive) date range — the capacity grid's input.
    /// </summary>
    Task<IReadOnlyList<Absence>> GetOverlappingAsync(
        TenantId tenantId,
        DateOnly from,
        DateOnly to,
        CancellationToken ct = default);
    
    Task<IEnumerable<Absence>> GetActiveAbsencesAsync(TenantId tenantId, DateOnly date, CancellationToken ct = default);
    
    Task AddAsync(Absence absence, CancellationToken ct = default);
    
    Task UpdateAsync(Absence absence, CancellationToken ct = default);
}
