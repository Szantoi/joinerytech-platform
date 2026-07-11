using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.Interfaces;

namespace SpaceOS.Modules.CRM.Application.Commands.QualifyLead;

/// <summary>
/// Handler for QualifyLeadCommand
/// </summary>
public class QualifyLeadCommandHandler : IRequestHandler<QualifyLeadCommand, Result>
{
    private readonly ILeadRepository _repository;

    public QualifyLeadCommandHandler(ILeadRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result> Handle(QualifyLeadCommand request, CancellationToken ct)
    {
        var lead = await _repository.GetByIdAsync(request.LeadId, ct).ConfigureAwait(false);
        if (lead == null)
        {
            return Result.NotFound($"Lead with ID {request.LeadId} not found");
        }

        if (lead.TenantId != request.TenantId)
        {
            return Result.Forbidden();
        }

        try
        {
            lead.Qualify();
            await _repository.UpdateAsync(lead, ct).ConfigureAwait(false);
            await _repository.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Invalid(new ValidationError { ErrorMessage = ex.Message });
        }
        catch (Exception ex)
        {
            return Result.Error(ex.Message);
        }
    }
}
