using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Queries.ListTrainingRecords;

public class ListTrainingRecordsQueryHandler : IRequestHandler<ListTrainingRecordsQuery, List<TrainingRecordListItemDto>>
{
    private readonly ITrainingRecordRepository _repository;
    private readonly IMapper _mapper;

    public ListTrainingRecordsQueryHandler(ITrainingRecordRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<TrainingRecordListItemDto>> Handle(ListTrainingRecordsQuery request, CancellationToken ct)
    {
        var trainingRecords = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return _mapper.Map<List<TrainingRecordListItemDto>>(trainingRecords);
    }
}
