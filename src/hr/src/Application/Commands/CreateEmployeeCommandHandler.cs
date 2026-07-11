using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Domain.StrongIds;
using SpaceOS.Modules.HR.Domain.ValueObjects;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Handler for CreateEmployeeCommand.
/// </summary>
public class CreateEmployeeCommandHandler : IRequestHandler<CreateEmployeeCommand, Result<EmployeeId>>
{
    private readonly IEmployeeRepository _employeeRepository;

    public CreateEmployeeCommandHandler(IEmployeeRepository employeeRepository)
    {
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<EmployeeId>> Handle(CreateEmployeeCommand request, CancellationToken ct)
    {
        try
        {
            // Check for duplicate email
            var existingEmployee = await _employeeRepository
                .GetByEmailAsync(TenantId.From(request.TenantId), request.Email, ct)
                .ConfigureAwait(false);

            if (existingEmployee != null)
            {
                return Result<EmployeeId>.Error($"Employee with email '{request.Email}' already exists");
            }

            // Create PayGrade value object
            var payGrade = PayGrade.Create(request.PayGradeName, request.HourlyRate);

            // Create employee aggregate using factory method
            var employee = Employee.Create(
                request.TenantId,
                request.Name,
                request.Role,
                request.Department,
                request.FacilityId,
                payGrade,
                request.WeeklyHours,
                request.Email);

            // Add skills if provided
            foreach (var skillPair in request.Skills)
            {
                employee.AddSkill(skillPair.Key, skillPair.Value);
            }

            // Persist the employee
            await _employeeRepository.AddAsync(employee, ct).ConfigureAwait(false);

            return Result<EmployeeId>.Success(employee.Id);
        }
        catch (ArgumentException ex)
        {
            // Domain validation errors
            return Result<EmployeeId>.Error(ex.Message);
        }
        catch (Exception ex)
        {
            // Infrastructure errors (database errors)
            return Result<EmployeeId>.Error($"Failed to create employee: {ex.Message}");
        }
    }
}
