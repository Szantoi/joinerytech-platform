namespace JoineryTech.HR.Domain.Repositories;

using JoineryTech.HR.Domain.Aggregates;
using JoineryTech.HR.Domain.ValueObjects;
using JoineryTech.HR.Domain.Enums;
using JoineryTech.SharedKernel;

/// <summary>
/// Repository contract for Absence aggregate
/// </summary>
public interface IAbsenceRepository
{
    // ============ QUERIES ============

    /// <summary>
    /// Get absence by ID (with RLS enforcement)
    /// </summary>
    Task<Absence?> GetByIdAsync(AbsenceId id, CancellationToken ct = default);

    /// <summary>
    /// Get all absences for an employee (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<Absence>> GetByEmployeeAsync(EmployeeId employeeId, CancellationToken ct = default);

    /// <summary>
    /// Get absences by status (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<Absence>> GetByStatusAsync(AbsenceStatus status, CancellationToken ct = default);

    /// <summary>
    /// Get absences overlapping a date range (with RLS enforcement)
    /// Used for capacity calculation and conflict detection
    /// </summary>
    Task<IEnumerable<Absence>> GetByDateRangeAsync(DateOnly startDate, DateOnly endDate, CancellationToken ct = default);

    /// <summary>
    /// Get absences for an employee in a specific year (with RLS enforcement)
    /// Used for vacation/sick leave balance calculation
    /// </summary>
    Task<IEnumerable<Absence>> GetByEmployeeAndYearAsync(EmployeeId employeeId, int year, CancellationToken ct = default);

    /// <summary>
    /// Get paged absences with optional filters (with RLS enforcement)
    /// </summary>
    Task<PagedResult<Absence>> GetPagedAsync(
        int page,
        int pageSize,
        AbsenceStatus? statusFilter = null,
        AbsenceType? typeFilter = null,
        EmployeeId? employeeFilter = null,
        CancellationToken ct = default);

    // ============ COMMANDS ============

    /// <summary>
    /// Add new absence (domain events not persisted here - use event bus)
    /// </summary>
    Task AddAsync(Absence absence, CancellationToken ct = default);

    /// <summary>
    /// Update existing absence (domain events not persisted here - use event bus)
    /// </summary>
    Task UpdateAsync(Absence absence, CancellationToken ct = default);

    // ============ AGGREGATE LOADING ============

    /// <summary>
    /// Get absence by ID with employee details
    /// Use when displaying absence with employee information
    /// </summary>
    Task<Absence?> GetByIdWithEmployeeAsync(AbsenceId id, CancellationToken ct = default);
}
