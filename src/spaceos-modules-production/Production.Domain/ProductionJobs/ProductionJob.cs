using SpaceOS.Modules.Production.Domain.ProductionJobs.Events;
using SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

namespace SpaceOS.Modules.Production.Domain.ProductionJobs;

/// <summary>
/// ProductionJob aggregate root - represents a Doorstar production workflow (6 STAGE)
/// </summary>
public class ProductionJob
{
    private readonly List<IDomainEvent> _domainEvents = new();

    public ProductionJobId Id { get; private set; }
    public Guid OrderId { get; private set; }
    public Guid CustomerId { get; private set; }
    public string ProjectName { get; private set; }
    public DateTimeOffset Deadline { get; private set; }
    public ProductionStatus Status { get; private set; }
    public string? StatusReason { get; private set; }
    public Guid? AssetId { get; private set; }
    public List<WorkflowStep> Steps { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    // EF Core constructor
    private ProductionJob() { Steps = new(); }

    private ProductionJob(Guid orderId, Guid customerId, string projectName, DateTimeOffset deadline)
    {
        Id = ProductionJobId.New();
        OrderId = orderId;
        CustomerId = customerId;
        ProjectName = projectName;
        Deadline = deadline;
        Status = ProductionStatus.Queued;
        CreatedAt = DateTimeOffset.UtcNow;

        // Initialize 6 STAGE workflow steps
        Steps = new List<WorkflowStep>
        {
            new WorkflowStep(WorkflowStepName.SzabaszatElőgyártás),
            new WorkflowStep(WorkflowStepName.Megmunkálás),
            new WorkflowStep(WorkflowStepName.Felületkezelés),
            new WorkflowStep(WorkflowStepName.Összeszerelés),
            new WorkflowStep(WorkflowStepName.Csomagolás),
            new WorkflowStep(WorkflowStepName.KiszállításraMegjelölés)
        };

        AddDomainEvent(new ProductionJobStarted(Id, OrderId, CreatedAt));
    }

    /// <summary>
    /// Factory method - Create new ProductionJob
    /// </summary>
    public static ProductionJob Create(Guid orderId, Guid customerId, string projectName, DateTimeOffset deadline)
    {
        return new ProductionJob(orderId, customerId, projectName, deadline);
    }

    /// <summary>
    /// Start a workflow step (Pending → InProgress)
    /// FSM Rule: Only ONE step can be InProgress at a time
    /// </summary>
    public Result StartStep(WorkflowStepName stepName)
    {
        var step = Steps.FirstOrDefault(s => s.Name == stepName);
        if (step == null)
            return Result.Failure($"Step {stepName} not found");

        // FSM Rule: Only 1 step InProgress at a time
        if (Steps.Any(s => s.Status == WorkflowStepStatus.InProgress))
            return Result.Failure("Another step is already in progress");

        // FSM Rule: Steps must be completed in order (cannot skip)
        var stepIndex = (int)stepName - 1;
        if (stepIndex > 0)
        {
            var previousStep = Steps[stepIndex - 1];
            if (previousStep.Status != WorkflowStepStatus.Done)
                return Result.Failure($"Previous step {previousStep.Name} must be completed first");
        }

        var result = step.Start();
        if (result.IsSuccess)
        {
            UpdateJobStatus();
            AddDomainEvent(new WorkflowStepStarted(Id, stepName, DateTimeOffset.UtcNow));
        }

        return result;
    }

    /// <summary>
    /// Complete a workflow step (InProgress → Done)
    /// </summary>
    public Result CompleteStep(WorkflowStepName stepName, string? photoUrl, string completedBy)
    {
        var step = Steps.FirstOrDefault(s => s.Name == stepName);
        if (step == null)
            return Result.Failure($"Step {stepName} not found");

        var result = step.Complete(photoUrl, completedBy);
        if (result.IsSuccess)
        {
            UpdateJobStatus();
            AddDomainEvent(new WorkflowStepCompleted(Id, stepName, DateTimeOffset.UtcNow, photoUrl));

            // Check if all steps are done → ShippingReady
            if (Status == ProductionStatus.ShippingReady)
            {
                AddDomainEvent(new ProductionJobShippingReady(Id, DateTimeOffset.UtcNow));
            }
        }

        return result;
    }

    /// <summary>
    /// Auto-complete step (used by event handlers, e.g., CuttingCompleted)
    /// </summary>
    public Result AutoCompleteStep(WorkflowStepName stepName, string completedBy)
    {
        var step = Steps.FirstOrDefault(s => s.Name == stepName);
        if (step == null)
            return Result.Failure($"Step {stepName} not found");

        var result = step.AutoComplete(completedBy);
        if (result.IsSuccess)
        {
            UpdateJobStatus();
            AddDomainEvent(new WorkflowStepCompleted(Id, stepName, DateTimeOffset.UtcNow, null));
        }

        return result;
    }

    /// <summary>
    /// Update ProductionJob status based on WorkflowStep statuses
    /// </summary>
    private void UpdateJobStatus()
    {
        if (Steps.All(s => s.Status == WorkflowStepStatus.Done))
        {
            Status = ProductionStatus.ShippingReady;
        }
        else if (Steps.Any(s => s.Status != WorkflowStepStatus.Pending))
        {
            Status = ProductionStatus.InProgress;
        }
    }

    /// <summary>
    /// Pause the ProductionJob (triggered by AssetDowntimeEvent)
    /// </summary>
    public void Pause(string reason)
    {
        StatusReason = reason;
        // Status remains unchanged - StatusReason provides context
        // Future enhancement: Add Paused status to ProductionStatus enum
    }

    /// <summary>
    /// Reschedule the ProductionJob deadline (triggered by AssetDowntimeEvent)
    /// </summary>
    public void Reschedule(DateTimeOffset? newDeadline)
    {
        if (newDeadline.HasValue && newDeadline.Value > Deadline)
        {
            Deadline = newDeadline.Value;
            StatusReason = $"Rescheduled due to asset unavailability";
        }
    }

    /// <summary>
    /// Assign an asset to this ProductionJob
    /// </summary>
    public void AssignAsset(Guid assetId)
    {
        AssetId = assetId;
    }

    private void AddDomainEvent(IDomainEvent @event) => _domainEvents.Add(@event);
    public void ClearDomainEvents() => _domainEvents.Clear();
}
