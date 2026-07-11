using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.TrainingRecordAggregate;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Commands.CreateTrainingRecord;

public class CreateTrainingRecordCommandHandler : IRequestHandler<CreateTrainingRecordCommand, Guid>
{
    private readonly ITrainingRecordRepository _repository;

    public CreateTrainingRecordCommandHandler(ITrainingRecordRepository repository)
    {
        _repository = repository;
    }

    public async Task<Guid> Handle(CreateTrainingRecordCommand request, CancellationToken ct)
    {
        var trainingRecord = TrainingRecord.Create(
            request.TenantId,
            request.EmployeeId,
            request.TrainingType,
            request.CompletedAt,
            request.IssuedBy,
            request.ExpiresAt,
            request.CertificateNumber
        );

        await _repository.AddAsync(trainingRecord, ct).ConfigureAwait(false);

        return trainingRecord.TrainingRecordId;
    }
}
