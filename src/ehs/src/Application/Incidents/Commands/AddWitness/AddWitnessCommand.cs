using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.AddWitness;

public record AddWitnessCommand(
    Guid IncidentId,
    Guid TenantId,
    Guid EmployeeId,
    string Statement
) : IRequest<Unit>;
