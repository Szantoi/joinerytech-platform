using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.Interfaces;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Commands.AddLeadTask;

/// <summary>
/// Handler for AddLeadTaskCommand
/// </summary>
public class AddLeadTaskCommandHandler : IRequestHandler<AddLeadTaskCommand, Result<Guid>>
{
    private readonly ILeadRepository _repository;

    public AddLeadTaskCommandHandler(ILeadRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result<Guid>> Handle(AddLeadTaskCommand request, CancellationToken ct)
    {
        var lead = await _repository.GetByIdAsync(request.LeadId, ct).ConfigureAwait(false);
        if (lead == null)
        {
            return Result<Guid>.NotFound($"Lead with ID {request.LeadId} not found");
        }

        if (lead.TenantId != request.TenantId)
        {
            return Result<Guid>.Forbidden();
        }

        try
        {
            // Parse CrmTaskPriority enum
            if (!Enum.TryParse<CrmTaskPriority>(request.Priority, ignoreCase: true, out var priority))
            {
                return Result<Guid>.Invalid(new ValidationError
                {
                    Identifier = nameof(request.Priority),
                    ErrorMessage = $"Invalid priority: {request.Priority}"
                });
            }

            // Add task using domain method
            var taskId = lead.AddTask(request.Title, request.DueDate, priority, request.CreatedBy);

            await _repository.UpdateAsync(lead, ct).ConfigureAwait(false);
            await _repository.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result<Guid>.Success(taskId);
        }
        catch (ArgumentException ex)
        {
            return Result<Guid>.Invalid(new ValidationError { ErrorMessage = ex.Message });
        }
        catch (Exception ex)
        {
            return Result<Guid>.Error(ex.Message);
        }
    }
}
