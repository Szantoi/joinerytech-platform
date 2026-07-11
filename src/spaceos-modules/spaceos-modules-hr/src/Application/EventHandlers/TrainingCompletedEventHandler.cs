using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.HR.Application.Contracts;
using SpaceOS.Modules.HR.Application.Exceptions;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.EventHandlers;

/// <summary>
/// Handles TrainingCompletedEvent from EHS module.
/// Updates Employee competency matrix when training is completed.
/// Cross-module integration: EHS → HR.
/// </summary>
public class TrainingCompletedEventHandler : INotificationHandler<TrainingCompletedEvent>
{
    private readonly IEmployeeRepository _repository;
    private readonly ILogger<TrainingCompletedEventHandler> _logger;

    public TrainingCompletedEventHandler(
        IEmployeeRepository repository,
        ILogger<TrainingCompletedEventHandler> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task Handle(TrainingCompletedEvent notification, CancellationToken ct)
    {
        _logger.LogInformation(
            "Processing TrainingCompletedEvent: EmployeeId={EmployeeId}, Training={TrainingName}",
            notification.EmployeeId,
            notification.TrainingName);

        var employee = await _repository.GetByIdAsync(notification.EmployeeId, ct).ConfigureAwait(false);

        if (employee == null)
        {
            _logger.LogError(
                "Employee {EmployeeId} not found for TrainingCompletedEvent.",
                notification.EmployeeId);
            throw new NotFoundException("Employee", notification.EmployeeId);
        }

        // Add competency to employee
        employee.AddCompetency(
            competencyId: notification.TrainingTypeId,
            competencyName: notification.TrainingName,
            level: notification.CertificationLevel,
            validFrom: notification.CompletionDate,
            validUntil: notification.CertificationExpiry
        );

        await _repository.SaveAsync(employee, ct).ConfigureAwait(false);

        _logger.LogInformation(
            "Employee {EmployeeId} competency '{CompetencyName}' added successfully",
            notification.EmployeeId,
            notification.TrainingName);
    }
}
