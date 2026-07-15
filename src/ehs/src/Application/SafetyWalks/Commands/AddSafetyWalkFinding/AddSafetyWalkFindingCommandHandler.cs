using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.AddSafetyWalkFinding;

/// <summary>
/// Handler for AddSafetyWalkFindingCommand.
/// 1. Records the finding on the aggregate (guard: walk must be InProgress).
/// 2. When CAPA data is provided, spawns a CorrectiveAction with
///    Source=SafetyWalk (unified CAPA) and links it to the finding.
/// Not-found → KeyNotFoundException (404); illegal state → InvalidOperationException (409).
/// </summary>
public class AddSafetyWalkFindingCommandHandler
    : IRequestHandler<AddSafetyWalkFindingCommand, AddSafetyWalkFindingResult>
{
    private readonly ISafetyWalkRepository _repository;
    private readonly ICorrectiveActionRepository _capaRepository;

    public AddSafetyWalkFindingCommandHandler(
        ISafetyWalkRepository repository,
        ICorrectiveActionRepository capaRepository)
    {
        _repository = repository;
        _capaRepository = capaRepository;
    }

    public async Task<AddSafetyWalkFindingResult> Handle(AddSafetyWalkFindingCommand request, CancellationToken ct)
    {
        var walk = await _repository.GetByIdAsync(request.SafetyWalkId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Safety walk {request.SafetyWalkId} not found");

        var finding = walk.AddFinding(
            request.Description,
            request.Severity,
            request.RequiresAction,
            request.PhotoS3Key,
            request.LinkedRiskAssessmentId);

        Guid? correctiveActionId = null;

        // Optional CAPA generation through the unified mechanism
        if (request.RequiresAction && request.CapaAssignedTo.HasValue && request.CapaDueDate.HasValue)
        {
            var capa = CorrectiveAction.CreateForSafetyWalk(
                request.TenantId,
                walk.SafetyWalkId,
                finding.FindingId,
                request.CapaDescription ?? request.Description,
                request.CapaAssignedTo.Value,
                request.CapaDueDate.Value);

            walk.LinkFindingCorrectiveAction(finding.FindingId, capa.CorrectiveActionId);

            await _capaRepository.AddAsync(capa, ct).ConfigureAwait(false);
            correctiveActionId = capa.CorrectiveActionId;
        }

        await _repository.UpdateAsync(walk, ct).ConfigureAwait(false);

        return new AddSafetyWalkFindingResult(finding.FindingId, correctiveActionId);
    }
}
