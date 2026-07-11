namespace SpaceOS.Modules.Procurement.Application.Commands.CreateLead;

using FluentValidation;

/// <summary>
/// Validator for CreateLeadCommand
/// </summary>
public class CreateLeadValidator : AbstractValidator<CreateLeadCommand>
{
    public CreateLeadValidator()
    {
        RuleFor(x => x.TenantId).NotEmpty();
        RuleFor(x => x.name).NotEmpty();
        RuleFor(x => x.email).NotEmpty();
        RuleFor(x => x.source).NotEmpty();
        RuleFor(x => x.assignedTo).NotEmpty();
    }
}
