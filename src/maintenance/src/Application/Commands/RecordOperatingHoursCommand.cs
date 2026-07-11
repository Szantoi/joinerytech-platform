using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to record operating hours for a Machine or Vehicle asset.
/// </summary>
public record RecordOperatingHoursCommand(
    AssetId AssetId,
    decimal Hours,
    Guid TenantId
) : IRequest<Result>;
