using FluentValidation;
using SpaceOS.Modules.CRM.Application.Commands;

namespace SpaceOS.Modules.CRM.Application.Validators;

public sealed class CreateLeadCommandValidator : AbstractValidator<CreateLeadCommand>
{
    public CreateLeadCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

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

        RuleFor(x => x.AssignedToUserId)
            .NotEmpty().WithMessage("AssignedToUserId cannot be empty");

        RuleFor(x => x.CreatedBy)
            .NotEmpty().WithMessage("CreatedBy user ID cannot be empty");
    }
}

public sealed class ContactLeadCommandValidator : AbstractValidator<ContactLeadCommand>
{
    public ContactLeadCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.LeadId)
            .NotEmpty().WithMessage("LeadId cannot be empty");

        RuleFor(x => x.ActedBy)
            .NotEmpty().WithMessage("ActedBy user ID cannot be empty");
    }
}

public sealed class QualifyLeadCommandValidator : AbstractValidator<QualifyLeadCommand>
{
    public QualifyLeadCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.LeadId)
            .NotEmpty().WithMessage("LeadId cannot be empty");

        RuleFor(x => x.ActedBy)
            .NotEmpty().WithMessage("ActedBy user ID cannot be empty");
    }
}

public sealed class DisqualifyLeadCommandValidator : AbstractValidator<DisqualifyLeadCommand>
{
    public DisqualifyLeadCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.LeadId)
            .NotEmpty().WithMessage("LeadId cannot be empty");

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Disqualification reason is required")
            .MaximumLength(512).WithMessage("Reason cannot exceed 512 characters");

        RuleFor(x => x.ActedBy)
            .NotEmpty().WithMessage("ActedBy user ID cannot be empty");
    }
}

public sealed class ConvertToOpportunityCommandValidator : AbstractValidator<ConvertToOpportunityCommand>
{
    public ConvertToOpportunityCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.LeadId)
            .NotEmpty().WithMessage("LeadId cannot be empty");

        RuleFor(x => x.CustomerId)
            .NotEmpty().WithMessage("CustomerId cannot be empty");

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

        RuleFor(x => x.ConvertedBy)
            .NotEmpty().WithMessage("ConvertedBy user ID cannot be empty");
    }
}

public sealed class ReassignLeadCommandValidator : AbstractValidator<ReassignLeadCommand>
{
    public ReassignLeadCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.LeadId)
            .NotEmpty().WithMessage("LeadId cannot be empty");

        RuleFor(x => x.ToUserId)
            .NotEmpty().WithMessage("ToUserId cannot be empty");

        RuleFor(x => x.ReassignedBy)
            .NotEmpty().WithMessage("ReassignedBy user ID cannot be empty");
    }
}

public sealed class LogLeadActivityCommandValidator : AbstractValidator<LogLeadActivityCommand>
{
    public LogLeadActivityCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.LeadId)
            .NotEmpty().WithMessage("LeadId cannot be empty");

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

public sealed class CreateLeadTaskCommandValidator : AbstractValidator<CreateLeadTaskCommand>
{
    public CreateLeadTaskCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.LeadId)
            .NotEmpty().WithMessage("LeadId cannot be empty");

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

public sealed class CompleteLeadTaskCommandValidator : AbstractValidator<CompleteLeadTaskCommand>
{
    public CompleteLeadTaskCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.LeadId)
            .NotEmpty().WithMessage("LeadId cannot be empty");

        RuleFor(x => x.TaskId)
            .NotEmpty().WithMessage("TaskId cannot be empty");

        RuleFor(x => x.CompletedBy)
            .NotEmpty().WithMessage("CompletedBy user ID cannot be empty");
    }
}

public sealed class UpdateLeadContactInfoCommandValidator : AbstractValidator<UpdateLeadContactInfoCommand>
{
    public UpdateLeadContactInfoCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.LeadId)
            .NotEmpty().WithMessage("LeadId cannot be empty");

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

        RuleFor(x => x.UpdatedBy)
            .NotEmpty().WithMessage("UpdatedBy user ID cannot be empty");
    }
}

public sealed class DeleteLeadCommandValidator : AbstractValidator<DeleteLeadCommand>
{
    public DeleteLeadCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("TenantId cannot be empty");

        RuleFor(x => x.LeadId)
            .NotEmpty().WithMessage("LeadId cannot be empty");

        RuleFor(x => x.DeletedBy)
            .NotEmpty().WithMessage("DeletedBy user ID cannot be empty");
    }
}
