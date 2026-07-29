using FluentValidation;

namespace SpaceOS.Collaboration.Application.Agreements;

/// <summary>Shape rules shared by every agreement command; invariants stay in the aggregate.</summary>
public abstract class AgreementCommandValidator<TCommand> : AbstractValidator<TCommand>
    where TCommand : IAgreementCommand
{
    protected AgreementCommandValidator()
    {
        RuleFor(command => command.AgreementId).NotEmpty();
        RuleFor(command => command.ActorTenantId).NotEmpty();
        RuleFor(command => command.ActorUserId).NotEmpty();
    }
}

/// <summary>Nothing beyond the shared shape.</summary>
public sealed class ProposeAgreementValidator : AgreementCommandValidator<ProposeAgreementCommand>;

/// <summary>
/// Cancelling may omit the reason: the aggregate treats it as optional for an unanswered offer,
/// and a validator that demanded one would be stricter than the rule it is guarding.
/// </summary>
public sealed class CancelAgreementValidator : AgreementCommandValidator<CancelAgreementCommand>;

public sealed class AcceptAgreementValidator : AgreementCommandValidator<AcceptAgreementCommand>
{
    public AcceptAgreementValidator()
    {
        RuleFor(command => command.TermsRevisionId)
            .NotEmpty()
            .WithMessage("Acceptance must name the terms revision it accepts.");

        RuleFor(command => command.AcceptanceEvidence)
            .NotEmpty()
            .WithMessage("An accepted agreement with nothing behind it looks binding and is not.");
    }
}

public sealed class RejectAgreementValidator : AgreementCommandValidator<RejectAgreementCommand>
{
    public RejectAgreementValidator() =>
        RuleFor(command => command.Reason)
            .NotEmpty()
            .WithMessage("A rejection must say why: the host can only act on a reason.");
}

public sealed class SupersedeAgreementValidator : AgreementCommandValidator<SupersedeAgreementCommand>
{
    public SupersedeAgreementValidator() =>
        RuleFor(command => command.SupersedingTermsRevisionId)
            .NotEmpty()
            .WithMessage("Superseding must name the revision that replaces the current terms.");
}
