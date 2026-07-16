using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to create the re-check inspection of a conditionally passed inspection
/// (ADR-063). The new inspection inherits the original's checkpoint/order/product
/// scope and references it via ReworkOfInspectionId — the original stays immutable.
/// Guard: the original must be Completed with Conditional result (otherwise 409).
/// </summary>
public record CreateReworkInspectionCommand(
    InspectionId OriginalInspectionId,
    Guid InspectorId,
    DateTime PlannedAt,
    Guid TenantId
) : IRequest<Result<InspectionId>>;
