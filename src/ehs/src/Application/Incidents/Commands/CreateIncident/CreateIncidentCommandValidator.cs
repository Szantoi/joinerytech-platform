using FluentValidation;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.CreateIncident;

/// <summary>
/// Validator for CreateIncidentCommand
/// </summary>
public class CreateIncidentCommandValidator : AbstractValidator<CreateIncidentCommand>
{
    public CreateIncidentCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.IncidentType)
            .IsInEnum()
            .WithMessage("Invalid incident type");

        RuleFor(x => x.IncidentDate)
            .LessThanOrEqualTo(DateTimeOffset.UtcNow)
            .WithMessage("Incident date cannot be in the future");

        RuleFor(x => x.Location)
            .NotEmpty()
            .MaximumLength(200)
            .WithMessage("Location is required and must be max 200 characters");

        RuleFor(x => x.Description)
            .NotEmpty()
            .MaximumLength(2000)
            .WithMessage("Description is required and must be max 2000 characters");

        RuleFor(x => x.Severity)
            .IsInEnum()
            .WithMessage("Invalid severity level");

        RuleFor(x => x.ReportedBy)
            .NotEmpty()
            .WithMessage("ReportedBy is required");
    }
}
