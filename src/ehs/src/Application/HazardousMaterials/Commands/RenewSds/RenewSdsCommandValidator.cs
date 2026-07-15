using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.RenewSds;

/// <summary>
/// Validator for RenewSdsCommand
/// </summary>
public class RenewSdsCommandValidator : AbstractValidator<RenewSdsCommand>
{
    public RenewSdsCommandValidator()
    {
        RuleFor(x => x.MaterialId)
            .NotEmpty()
            .WithMessage("MaterialId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.NewExpiresAt)
            .GreaterThan(x => x.NewIssuedAt)
            .WithMessage("New SDS expiry must be after its issue date");
    }
}
