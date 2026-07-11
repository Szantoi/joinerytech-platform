using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Commands.CreateTrainingRecord;

public class CreateTrainingRecordCommandValidator : AbstractValidator<CreateTrainingRecordCommand>
{
    public CreateTrainingRecordCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty();

        RuleFor(x => x.EmployeeId)
            .NotEmpty();

        RuleFor(x => x.TrainingType)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.IssuedBy)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.CompletedAt)
            .LessThanOrEqualTo(DateTimeOffset.UtcNow)
            .WithMessage("Training completion date cannot be in the future");

        RuleFor(x => x.ExpiresAt)
            .GreaterThan(x => x.CompletedAt)
            .When(x => x.ExpiresAt.HasValue)
            .WithMessage("Expiry date must be after completion date");

        RuleFor(x => x.CertificateNumber)
            .MaximumLength(100)
            .When(x => !string.IsNullOrWhiteSpace(x.CertificateNumber));
    }
}
