using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.Commands.RenewTrainingRecord;

public class RenewTrainingRecordCommandValidator : AbstractValidator<RenewTrainingRecordCommand>
{
    public RenewTrainingRecordCommandValidator()
    {
        RuleFor(x => x.TrainingRecordId)
            .NotEmpty();

        RuleFor(x => x.TenantId)
            .NotEmpty();

        RuleFor(x => x.NewCompletionDate)
            .LessThanOrEqualTo(DateTimeOffset.UtcNow)
            .WithMessage("Training completion date cannot be in the future");

        RuleFor(x => x.NewExpiryDate)
            .GreaterThan(x => x.NewCompletionDate)
            .When(x => x.NewExpiryDate.HasValue)
            .WithMessage("Expiry date must be after completion date");
    }
}
