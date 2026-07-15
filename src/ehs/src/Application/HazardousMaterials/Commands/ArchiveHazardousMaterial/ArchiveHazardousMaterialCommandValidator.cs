using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.ArchiveHazardousMaterial;

/// <summary>
/// Validator for ArchiveHazardousMaterialCommand
/// </summary>
public class ArchiveHazardousMaterialCommandValidator : AbstractValidator<ArchiveHazardousMaterialCommand>
{
    public ArchiveHazardousMaterialCommandValidator()
    {
        RuleFor(x => x.MaterialId)
            .NotEmpty()
            .WithMessage("MaterialId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
