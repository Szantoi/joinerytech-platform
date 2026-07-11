using MediatR;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Queries.GetExpiringTrainings;

public record GetExpiringTrainingsQuery(
    Guid TenantId,
    int DaysAhead = 30
) : IRequest<List<ExpiringTrainingDto>>;
