using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Queries.GetTrainingRecordById;

public class GetTrainingRecordByIdQueryHandler : IRequestHandler<GetTrainingRecordByIdQuery, TrainingRecordDto?>
{
    private readonly ITrainingRecordRepository _repository;
    private readonly IMapper _mapper;

    public GetTrainingRecordByIdQueryHandler(ITrainingRecordRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<TrainingRecordDto?> Handle(GetTrainingRecordByIdQuery request, CancellationToken ct)
    {
        var trainingRecord = await _repository.GetByIdAsync(request.TrainingRecordId, request.TenantId, ct).ConfigureAwait(false);

        return trainingRecord == null ? null : _mapper.Map<TrainingRecordDto>(trainingRecord);
    }
}
