using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Queries.ListTrainingRecords;

public record ListTrainingRecordsQuery(
    Guid TenantId,
    TrainingRecordFilter Filter
) : IRequest<List<TrainingRecordListItemDto>>;
