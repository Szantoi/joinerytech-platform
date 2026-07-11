using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Queries.GetExpiringTrainings;

public class GetExpiringTrainingsQueryHandler : IRequestHandler<GetExpiringTrainingsQuery, List<ExpiringTrainingDto>>
{
    private readonly ITrainingRecordRepository _repository;

    public GetExpiringTrainingsQueryHandler(ITrainingRecordRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<ExpiringTrainingDto>> Handle(GetExpiringTrainingsQuery request, CancellationToken ct)
    {
        var expiringTrainings = await _repository.GetExpiringTrainingsAsync(request.TenantId, request.DaysAhead, ct).ConfigureAwait(false);

        return expiringTrainings;
    }
}
