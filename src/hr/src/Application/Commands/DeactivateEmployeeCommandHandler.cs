using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Handler for DeactivateEmployeeCommand.
/// </summary>
public class DeactivateEmployeeCommandHandler : IRequestHandler<DeactivateEmployeeCommand, Result>
{
    private readonly IEmployeeRepository _employeeRepository;

    public DeactivateEmployeeCommandHandler(IEmployeeRepository employeeRepository)
    {
        _employeeRepository = employeeRepository;
    }

    public async Task<Result> Handle(DeactivateEmployeeCommand request, CancellationToken ct)
    {
        try
        {
            var employee = await _employeeRepository
                .GetByIdAsync(request.EmployeeId, ct)
                .ConfigureAwait(false);

            if (employee == null)
            {
                return Result.NotFound($"Employee with ID '{request.EmployeeId}' not found");
            }

            // Deactivate using Domain method
            employee.Deactivate();

            // Persist changes
            await _employeeRepository.UpdateAsync(employee, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (ArgumentException ex)
        {
            return Result.Error(ex.Message);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to deactivate employee: {ex.Message}");
        }
    }
}
