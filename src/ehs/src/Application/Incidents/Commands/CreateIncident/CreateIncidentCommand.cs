using MediatR;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.CreateIncident;

/// <summary>
/// Command to create a new workplace incident
/// </summary>
public record CreateIncidentCommand(
    Guid TenantId,
    IncidentType IncidentType,
    DateTimeOffset IncidentDate,
    string Location,
    string Description,
    Severity Severity,
    Guid ReportedBy
) : IRequest<Guid>;
