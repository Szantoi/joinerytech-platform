using SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

namespace SpaceOS.Modules.Production.Domain.ProductionJobs;

/// <summary>
/// WorkflowStep entity - represents one of the 6 STAGE production steps
/// </summary>
public class WorkflowStep
{
    public WorkflowStepId Id { get; private set; }
    public WorkflowStepName Name { get; private set; }
    public WorkflowStepStatus Status { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public string? PhotoUrl { get; private set; }
    public string? CompletedBy { get; private set; }

    // EF Core constructor
    private WorkflowStep() { }

    public WorkflowStep(WorkflowStepName name)
    {
        Id = WorkflowStepId.New();
        Name = name;
        Status = WorkflowStepStatus.Pending;
    }

    /// <summary>
    /// Start this workflow step (Pending → InProgress)
    /// </summary>
    public Result Start()
    {
        if (Status != WorkflowStepStatus.Pending)
            return Result.Failure($"Cannot start step {Name} - current status: {Status}");

        Status = WorkflowStepStatus.InProgress;
        StartedAt = DateTimeOffset.UtcNow;
        return Result.Success();
    }

    /// <summary>
    /// Complete this workflow step (InProgress → Done)
    /// Photo required for Összeszerelés step
    /// </summary>
    public Result Complete(string? photoUrl, string completedBy)
    {
        if (Status != WorkflowStepStatus.InProgress)
            return Result.Failure($"Cannot complete step {Name} - current status: {Status}");

        // Photo validation for Összeszerelés step
        if (Name == WorkflowStepName.Összeszerelés && string.IsNullOrWhiteSpace(photoUrl))
            return Result.Failure("Photo upload is required for Összeszerelés step");

        Status = WorkflowStepStatus.Done;
        CompletedAt = DateTimeOffset.UtcNow;
        PhotoUrl = photoUrl;
        CompletedBy = completedBy;
        return Result.Success();
    }

    /// <summary>
    /// Auto-complete step (used by CuttingCompleted event handler)
    /// </summary>
    public Result AutoComplete(string completedBy)
    {
        if (Status == WorkflowStepStatus.Done)
            return Result.Success(); // Already done, idempotent

        if (Status == WorkflowStepStatus.Pending)
        {
            Status = WorkflowStepStatus.InProgress;
            StartedAt = DateTimeOffset.UtcNow;
        }

        Status = WorkflowStepStatus.Done;
        CompletedAt = DateTimeOffset.UtcNow;
        CompletedBy = completedBy;
        return Result.Success();
    }
}

/// <summary>
/// Result pattern (simple implementation)
/// </summary>
public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public string? Error { get; }

    private Result(bool isSuccess, string? error)
    {
        IsSuccess = isSuccess;
        Error = error;
    }

    public static Result Success() => new(true, null);
    public static Result Failure(string error) => new(false, error);
}
