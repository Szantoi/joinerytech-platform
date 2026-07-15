using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.RegisterHazardousMaterial;

/// <summary>
/// Validator for RegisterHazardousMaterialCommand
/// </summary>
public class RegisterHazardousMaterialCommandValidator : AbstractValidator<RegisterHazardousMaterialCommand>
{
    public RegisterHazardousMaterialCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200)
            .WithMessage("Name is required and must be max 200 characters");

        RuleFor(x => x.Supplier)
            .NotEmpty()
            .MaximumLength(200)
            .WithMessage("Supplier is required and must be max 200 characters");

        RuleFor(x => x.StorageLocationId)
            .NotEmpty()
            .WithMessage("StorageLocationId is required");

        RuleFor(x => x.QuantityOnSite)
            .GreaterThanOrEqualTo(0)
            .WithMessage("QuantityOnSite cannot be negative");

        RuleFor(x => x.Unit)
            .NotEmpty()
            .MaximumLength(20)
            .WithMessage("Unit is required and must be max 20 characters");

        RuleFor(x => x.SdsExpiresAt)
            .GreaterThan(x => x.SdsIssuedAt)
            .WithMessage("SdsExpiresAt must be after SdsIssuedAt");
    }
}
