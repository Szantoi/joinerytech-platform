using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.RemoveOverheadRule;

/// <summary>
/// Command: Remove overhead rule from OverheadConfig (owned collection)
/// </summary>
public record RemoveOverheadRuleCommand(
    Guid TenantId,
    CostCategory Category,
    Guid UpdatedBy
) : IRequest<Result<Guid>>;
