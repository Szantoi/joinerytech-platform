using MediatR;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Queries.GetTrainingRecordById;

public record GetTrainingRecordByIdQuery(
    Guid TrainingRecordId,
    Guid TenantId
) : IRequest<TrainingRecordDto?>;
