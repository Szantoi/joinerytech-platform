using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Repositories;

public interface IAbsenceRepository
{
    Task<Absence?> GetByIdAsync(AbsenceId id, CancellationToken ct = default);
    
    Task<IEnumerable<Absence>> GetByEmployeeAndYearAsync(EmployeeId employeeId, int year, CancellationToken ct = default);
    
    Task<IEnumerable<Absence>> GetPendingAsync(TenantId tenantId, CancellationToken ct = default);
    
    Task<IEnumerable<Absence>> GetActiveAbsencesAsync(TenantId tenantId, DateOnly date, CancellationToken ct = default);
    
    Task AddAsync(Absence absence, CancellationToken ct = default);
    
    Task UpdateAsync(Absence absence, CancellationToken ct = default);
}
