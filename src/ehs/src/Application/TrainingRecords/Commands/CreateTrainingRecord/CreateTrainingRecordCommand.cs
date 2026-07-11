using MediatR;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Commands.CreateTrainingRecord;

public record CreateTrainingRecordCommand(
    Guid TenantId,
    Guid EmployeeId,
    string TrainingType,
    DateTimeOffset CompletedAt,
    string IssuedBy,
    DateTimeOffset? ExpiresAt = null,
    string? CertificateNumber = null
) : IRequest<Guid>;
