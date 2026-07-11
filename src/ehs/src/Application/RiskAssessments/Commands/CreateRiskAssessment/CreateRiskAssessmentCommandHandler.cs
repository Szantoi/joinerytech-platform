using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.CreateRiskAssessment;

public class CreateRiskAssessmentCommandHandler : IRequestHandler<CreateRiskAssessmentCommand, Guid>
{
    private readonly IRiskAssessmentRepository _repository;

    public CreateRiskAssessmentCommandHandler(IRiskAssessmentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Guid> Handle(CreateRiskAssessmentCommand request, CancellationToken ct)
    {
        var riskAssessment = RiskAssessment.Create(
            request.TenantId,
            request.HazardDescription,
            request.Severity,
            request.Likelihood,
            request.AssessedBy,
            request.ReviewDueDate
        );

        await _repository.AddAsync(riskAssessment, ct).ConfigureAwait(false);

        return riskAssessment.RiskAssessmentId;
    }
}
