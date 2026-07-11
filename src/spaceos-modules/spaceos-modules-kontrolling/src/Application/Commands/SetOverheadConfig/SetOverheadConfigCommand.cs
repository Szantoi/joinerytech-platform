using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.SetOverheadConfig;

/// <summary>
/// Command to set (create or update) overhead configuration for a tenant
/// </summary>
public record SetOverheadConfigCommand(
    Guid TenantId,
    OverheadAllocationMethod Method,
    decimal Rate,
    Guid UpdatedBy
) : IRequest<Result>;
