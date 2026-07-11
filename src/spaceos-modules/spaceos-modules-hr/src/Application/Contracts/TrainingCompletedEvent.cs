using MediatR;

namespace SpaceOS.Modules.HR.Application.Contracts;

/// <summary>
/// Temporary stub for TrainingCompletedEvent (cross-module contract).
/// TODO: Move to shared SpaceOS.Modules.Contracts assembly once EHS module is fully integrated.
/// </summary>
public record TrainingCompletedEvent(
    Guid EmployeeId,
    Guid TrainingTypeId,
    string TrainingName,
    string CertificationLevel,
    DateTime CompletionDate,
    DateTime? CertificationExpiry
) : INotification;
