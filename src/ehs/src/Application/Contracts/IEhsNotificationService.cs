namespace SpaceOS.Modules.Ehs.Application.Contracts;

/// <summary>
/// Notification service for EHS alerts (optional)
/// Implementation in Infrastructure layer (Week 3)
/// </summary>
public interface IEhsNotificationService
{
    Task SendIncidentAlertAsync(Guid incidentId, string severity, CancellationToken ct = default);
    Task SendRiskAssessmentAlertAsync(Guid riskAssessmentId, string riskLevel, CancellationToken ct = default);
    Task SendTrainingExpiryAlertAsync(Guid employeeId, string trainingType, DateTimeOffset expiresAt, CancellationToken ct = default);
}
