using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.AddInvestigationFindings;

public record AddInvestigationFindingsCommand(
    Guid IncidentId,
    Guid TenantId,
    string Findings,
    string RootCause,
    string? Recommendations
) : IRequest<Unit>;
