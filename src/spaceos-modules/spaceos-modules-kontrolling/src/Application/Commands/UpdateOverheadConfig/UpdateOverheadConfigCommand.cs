using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.UpdateOverheadConfig;

/// <summary>
/// Command to update existing overhead configuration (requires config to exist)
/// </summary>
public record UpdateOverheadConfigCommand(
    Guid TenantId,
    OverheadAllocationMethod Method,
    decimal Rate,
    Guid UpdatedBy
) : IRequest<Result>;
