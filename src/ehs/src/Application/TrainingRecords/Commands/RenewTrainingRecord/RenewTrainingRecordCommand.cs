using MediatR;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Commands.RenewTrainingRecord;

public record RenewTrainingRecordCommand(
    Guid TrainingRecordId,
    Guid TenantId,
    DateTimeOffset NewCompletionDate,
    DateTimeOffset? NewExpiryDate
) : IRequest<Guid>;
