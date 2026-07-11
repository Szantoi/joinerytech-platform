using FluentValidation;
using SpaceOS.Modules.CRM.Application.Commands;

namespace SpaceOS.Modules.CRM.Application.Validators;

public sealed class CreateOpportunityCommandValidator : AbstractValidator<CreateOpportunityCommand>
{
    public CreateOpportunityCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.CustomerId)
            .NotEmpty().WithMessage("CustomerId cannot be empty");

        RuleFor(x => x.ContactName)
            .NotEmpty().WithMessage("Contact name is required")
            .MaximumLength(256).WithMessage("Contact name cannot exceed 256 characters");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Email format is invalid");

        RuleFor(x => x.Phone)
            .MaximumLength(20).WithMessage("Phone cannot exceed 20 characters")
            .When(x => !string.IsNullOrWhiteSpace(x.Phone));

        RuleFor(x => x.Company)
            .MaximumLength(256).WithMessage("Company name cannot exceed 256 characters")
            .When(x => !string.IsNullOrWhiteSpace(x.Company));

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Opportunity title is required")
            .MaximumLength(512).WithMessage("Title cannot exceed 512 characters");

        RuleFor(x => x.EstimatedValue)
            .GreaterThan(0).WithMessage("Estimated value must be greater than 0");

        RuleFor(x => x.Currency)
            .NotEmpty().WithMessage("Currency is required")
            .Length(3).WithMessage("Currency must be 3-letter ISO code")
            .Matches("^[A-Z]{3}$").WithMessage("Currency must be uppercase 3-letter code");

        RuleFor(x => x.ExpectedCloseDate)
            .GreaterThan(DateTime.UtcNow).WithMessage("Expected close date must be in the future")
            .When(x => x.ExpectedCloseDate.HasValue);

        RuleFor(x => x.AssignedToUserId)
            .NotEmpty().WithMessage("AssignedToUserId cannot be empty");

        RuleFor(x => x.CreatedBy)
            .NotEmpty().WithMessage("CreatedBy user ID cannot be empty");
    }
}

public sealed class StartNeedsAssessmentCommandValidator : AbstractValidator<StartNeedsAssessmentCommand>
{
    public StartNeedsAssessmentCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.OpportunityId)
            .NotEmpty().WithMessage("OpportunityId cannot be empty");

        RuleFor(x => x.ActedBy)
            .NotEmpty().WithMessage("ActedBy user ID cannot be empty");
    }
}

public sealed class StartSolutionAssemblyCommandValidator : AbstractValidator<StartSolutionAssemblyCommand>
{
    public StartSolutionAssemblyCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.OpportunityId)
            .NotEmpty().WithMessage("OpportunityId cannot be empty");

        RuleFor(x => x.ActedBy)
            .NotEmpty().WithMessage("ActedBy user ID cannot be empty");
    }
}

public sealed class SendProposalCommandValidator : AbstractValidator<SendProposalCommand>
{
    public SendProposalCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.OpportunityId)
            .NotEmpty().WithMessage("OpportunityId cannot be empty");

        RuleFor(x => x.QuoteId)
            .NotEmpty().WithMessage("QuoteId cannot be empty");

        RuleFor(x => x.SentBy)
            .NotEmpty().WithMessage("SentBy user ID cannot be empty");
    }
}

public sealed class StartNegotiationCommandValidator : AbstractValidator<StartNegotiationCommand>
{
    public StartNegotiationCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.OpportunityId)
            .NotEmpty().WithMessage("OpportunityId cannot be empty");

        RuleFor(x => x.ActedBy)
            .NotEmpty().WithMessage("ActedBy user ID cannot be empty");
    }
}

public sealed class WinOpportunityCommandValidator : AbstractValidator<WinOpportunityCommand>
{
    public WinOpportunityCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.OpportunityId)
            .NotEmpty().WithMessage("OpportunityId cannot be empty");

        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage("OrderId cannot be empty");

        RuleFor(x => x.FinalValue)
            .GreaterThan(0).WithMessage("Final value must be greater than 0")
            .When(x => x.FinalValue.HasValue);

        RuleFor(x => x.WonBy)
            .NotEmpty().WithMessage("WonBy user ID cannot be empty");
    }
}

public sealed class LoseOpportunityCommandValidator : AbstractValidator<LoseOpportunityCommand>
{
    public LoseOpportunityCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.OpportunityId)
            .NotEmpty().WithMessage("OpportunityId cannot be empty");

        RuleFor(x => x.LostBy)
            .NotEmpty().WithMessage("LostBy user ID cannot be empty");
    }
}

public sealed class AbandonOpportunityCommandValidator : AbstractValidator<AbandonOpportunityCommand>
{
    public AbandonOpportunityCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.OpportunityId)
            .NotEmpty().WithMessage("OpportunityId cannot be empty");

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Abandonment reason is required")
            .MaximumLength(512).WithMessage("Reason cannot exceed 512 characters");

        RuleFor(x => x.AbandonedBy)
            .NotEmpty().WithMessage("AbandonedBy user ID cannot be empty");
    }
}

public sealed class UpdateOpportunityEstimateCommandValidator : AbstractValidator<UpdateOpportunityEstimateCommand>
{
    public UpdateOpportunityEstimateCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.OpportunityId)
            .NotEmpty().WithMessage("OpportunityId cannot be empty");

        RuleFor(x => x.NewValue)
            .GreaterThan(0).WithMessage("New value must be greater than 0")
            .When(x => x.NewValue.HasValue);

        RuleFor(x => x.Currency)
            .Length(3).WithMessage("Currency must be 3-letter ISO code")
            .Matches("^[A-Z]{3}$").WithMessage("Currency must be uppercase 3-letter code")
            .When(x => !string.IsNullOrWhiteSpace(x.Currency));

        RuleFor(x => x.NewProbability)
            .GreaterThanOrEqualTo(0).WithMessage("Probability must be >= 0")
            .LessThanOrEqualTo(100).WithMessage("Probability must be <= 100")
            .When(x => x.NewProbability.HasValue);

        // At least one field must be provided
        RuleFor(x => x)
            .Must(x => x.NewValue.HasValue || x.NewProbability.HasValue)
            .WithMessage("Either NewValue or NewProbability must be provided")
            .WithName("UpdateOpportunityEstimate");

        RuleFor(x => x.UpdatedBy)
            .NotEmpty().WithMessage("UpdatedBy user ID cannot be empty");
    }
}

public sealed class ReassignOpportunityCommandValidator : AbstractValidator<ReassignOpportunityCommand>
{
    public ReassignOpportunityCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.OpportunityId)
            .NotEmpty().WithMessage("OpportunityId cannot be empty");

        RuleFor(x => x.ToUserId)
            .NotEmpty().WithMessage("ToUserId cannot be empty");

        RuleFor(x => x.ReassignedBy)
            .NotEmpty().WithMessage("ReassignedBy user ID cannot be empty");
    }
}

public sealed class LogOpportunityActivityCommandValidator : AbstractValidator<LogOpportunityActivityCommand>
{
    public LogOpportunityActivityCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.OpportunityId)
            .NotEmpty().WithMessage("OpportunityId cannot be empty");

        RuleFor(x => x.ActivityType)
            .NotEmpty().WithMessage("Activity type is required")
            .Must(x => new[] { "Call", "Email", "Meeting", "Note" }.Contains(x))
            .WithMessage("Activity type must be one of: Call, Email, Meeting, Note");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Activity description is required")
            .MaximumLength(2048).WithMessage("Description cannot exceed 2048 characters");

        RuleFor(x => x.LoggedBy)
            .NotEmpty().WithMessage("LoggedBy user ID cannot be empty");
    }
}

public sealed class CreateOpportunityTaskCommandValidator : AbstractValidator<CreateOpportunityTaskCommand>
{
    public CreateOpportunityTaskCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.OpportunityId)
            .NotEmpty().WithMessage("OpportunityId cannot be empty");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Task title is required")
            .MaximumLength(512).WithMessage("Title cannot exceed 512 characters");

        RuleFor(x => x.DueDate)
            .GreaterThan(DateTime.UtcNow).WithMessage("Due date must be in the future");

        RuleFor(x => x.Priority)
            .Must(x => new[] { "high", "medium", "low" }.Contains(x.ToLowerInvariant()))
            .WithMessage("Priority must be: high, medium, or low");

        RuleFor(x => x.CreatedBy)
            .NotEmpty().WithMessage("CreatedBy user ID cannot be empty");
    }
}
