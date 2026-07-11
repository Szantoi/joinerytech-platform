using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Infrastructure.Notifications;

/// <summary>
/// Stub implementation of EHS notification service.
/// Week 3: Placeholder with logging only.
/// Week 4+: Integrate with actual notification provider (email, SMS, Teams, Slack).
/// </summary>
public class EhsNotificationService : IEhsNotificationService
{
    private readonly ILogger<EhsNotificationService> _logger;

    public EhsNotificationService(ILogger<EhsNotificationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Send incident alert notification (stub).
    /// </summary>
    public Task SendIncidentAlertAsync(Guid incidentId, string severity, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "EHS Notification: Incident alert triggered. IncidentId={IncidentId}, Severity={Severity}",
            incidentId,
            severity);

        // TODO Week 4+: Integrate with notification provider
        return Task.CompletedTask;
    }

    /// <summary>
    /// Send risk assessment alert notification (stub).
    /// </summary>
    public Task SendRiskAssessmentAlertAsync(Guid riskAssessmentId, string riskLevel, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "EHS Notification: Risk assessment alert triggered. RiskAssessmentId={RiskAssessmentId}, RiskLevel={RiskLevel}",
            riskAssessmentId,
            riskLevel);

        // TODO Week 4+: Integrate with notification provider
        return Task.CompletedTask;
    }

    /// <summary>
    /// Send training expiry alert notification (stub).
    /// </summary>
    public Task SendTrainingExpiryAlertAsync(Guid employeeId, string trainingType, DateTimeOffset expiresAt, CancellationToken ct = default)
    {
        var daysUntilExpiry = (expiresAt - DateTimeOffset.UtcNow).TotalDays;

        _logger.LogInformation(
            "EHS Notification: Training expiry alert triggered. EmployeeId={EmployeeId}, TrainingType={TrainingType}, ExpiresAt={ExpiresAt}, DaysUntilExpiry={DaysUntilExpiry}",
            employeeId,
            trainingType,
            expiresAt,
            (int)daysUntilExpiry);

        // TODO Week 4+: Integrate with notification provider
        return Task.CompletedTask;
    }
}
