using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.AddOverheadRule;

/// <summary>
/// Command: Add overhead rule to OverheadConfig (owned collection)
/// </summary>
public record AddOverheadRuleCommand(
    Guid TenantId,
    CostCategory Category,
    bool Exclude,
    decimal? CustomRate,
    Guid UpdatedBy
) : IRequest<Result<Guid>>;
