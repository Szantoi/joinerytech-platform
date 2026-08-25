using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Mappings;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Queries.ListTrainingRecords;

public class ListTrainingRecordsQueryHandler : IRequestHandler<ListTrainingRecordsQuery, List<TrainingRecordListItemDto>>
{
    private readonly ITrainingRecordRepository _repository;

    public ListTrainingRecordsQueryHandler(ITrainingRecordRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<TrainingRecordListItemDto>> Handle(ListTrainingRecordsQuery request, CancellationToken ct)
    {
        var trainingRecords = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return trainingRecords.Select(trainingRecord => trainingRecord.ToListItemDto()).ToList();
    }
}
