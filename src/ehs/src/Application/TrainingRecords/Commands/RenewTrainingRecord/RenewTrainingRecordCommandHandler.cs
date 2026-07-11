using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Commands.RenewTrainingRecord;

public class RenewTrainingRecordCommandHandler : IRequestHandler<RenewTrainingRecordCommand, Guid>
{
    private readonly ITrainingRecordRepository _repository;

    public RenewTrainingRecordCommandHandler(ITrainingRecordRepository repository)
    {
        _repository = repository;
    }

    public async Task<Guid> Handle(RenewTrainingRecordCommand request, CancellationToken ct)
    {
        var trainingRecord = await _repository.GetByIdAsync(request.TrainingRecordId, request.TenantId, ct).ConfigureAwait(false);

        if (trainingRecord == null)
            throw new InvalidOperationException($"TrainingRecord {request.TrainingRecordId} not found");

        var renewedRecord = trainingRecord.Renew(request.NewCompletionDate, request.NewExpiryDate);

        await _repository.AddAsync(renewedRecord, ct).ConfigureAwait(false);

        return renewedRecord.TrainingRecordId;
    }
}
