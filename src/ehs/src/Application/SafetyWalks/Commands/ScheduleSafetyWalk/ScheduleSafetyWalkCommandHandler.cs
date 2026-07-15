using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.SafetyWalkAggregate;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.ScheduleSafetyWalk;

/// <summary>
/// Handler for ScheduleSafetyWalkCommand.
/// Verifies the inspected location exists before scheduling.
/// </summary>
public class ScheduleSafetyWalkCommandHandler : IRequestHandler<ScheduleSafetyWalkCommand, Guid>
{
    private readonly ISafetyWalkRepository _repository;
    private readonly IEhsLocationRepository _locationRepository;

    public ScheduleSafetyWalkCommandHandler(
        ISafetyWalkRepository repository,
        IEhsLocationRepository locationRepository)
    {
        _repository = repository;
        _locationRepository = locationRepository;
    }

    public async Task<Guid> Handle(ScheduleSafetyWalkCommand request, CancellationToken ct)
    {
        // Guard: the inspected location must exist within the same tenant
        var locationExists = await _locationRepository
            .ExistsAsync(request.LocationId, request.TenantId, ct)
            .ConfigureAwait(false);

        if (!locationExists)
            throw new InvalidOperationException($"Location {request.LocationId} not found");

        var walk = SafetyWalk.Schedule(
            request.TenantId,
            request.LocationId,
            request.ScheduledDate,
            request.ConductedBy,
            request.Participants);

        await _repository.AddAsync(walk, ct).ConfigureAwait(false);

        return walk.SafetyWalkId;
    }
}
