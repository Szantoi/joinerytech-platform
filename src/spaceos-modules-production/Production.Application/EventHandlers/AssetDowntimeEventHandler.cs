using MediatR;
using SpaceOS.Modules.Contracts.Maintenance.Events;
using SpaceOS.Modules.Production.Domain.Abstractions;
using SpaceOS.Modules.Production.Domain.ProductionJobs;

namespace SpaceOS.Modules.Production.Application.EventHandlers;

/// <summary>
/// Handles AssetDowntimeEvent from Maintenance module - reschedules or pauses affected ProductionJobs
/// Cross-module integration: Maintenance → Production
/// </summary>
public class AssetDowntimeEventHandler : INotificationHandler<AssetDowntimeEvent>
{
    private readonly IProductionJobRepository _repository;

    public AssetDowntimeEventHandler(IProductionJobRepository repository)
    {
        _repository = repository;
    }

    public async Task Handle(AssetDowntimeEvent notification, CancellationToken ct)
    {
        // Find all ProductionJobs using this asset
        var affectedJobs = await _repository.FindByAssetIdAsync(notification.AssetId, ct).ConfigureAwait(false);

        if (affectedJobs.Count == 0)
        {
            // No jobs affected by this asset downtime
            return;
        }

        foreach (var job in affectedJobs)
        {
            if (job.Status == ProductionStatus.InProgress)
            {
                // Pause in-progress jobs
                job.Pause(reason: $"Asset '{notification.AssetName}' unavailable: {notification.Reason}");
            }
            else if (job.Status == ProductionStatus.Queued && notification.EstimatedFixDate.HasValue)
            {
                // Reschedule queued jobs if fix date is known
                job.Reschedule(newDeadline: notification.EstimatedFixDate);
            }

            await _repository.UpdateAsync(job, ct).ConfigureAwait(false);
        }

        await _repository.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
