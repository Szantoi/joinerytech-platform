using FluentValidation;

namespace SpaceOS.Collaboration.Application.WorkPackages;

/// <summary>
/// Shape rules shared by every work-package command.
/// </summary>
/// <remarks>
/// <b>Shape only.</b> Whether this actor may make this transition from this state is a business
/// invariant and stays in the aggregate — a validator that repeated it would be a second copy of
/// the rule, and the two would part company at the first change. What belongs here is what the
/// domain cannot check because the value never reaches it intact: an empty id, a blank reason.
/// </remarks>
public abstract class WorkPackageCommandValidator<TCommand> : AbstractValidator<TCommand>
    where TCommand : IWorkPackageCommand
{
    protected WorkPackageCommandValidator()
    {
        RuleFor(command => command.WorkPackageId).NotEmpty();
        RuleFor(command => command.ActorTenantId).NotEmpty();
        RuleFor(command => command.ActorUserId).NotEmpty();
    }
}

/// <summary>
/// Shape rules of the create command (B2B-10 F5/1) — its own base, because the shared one is for
/// commands that name an existing package.
/// </summary>
public sealed class CreateWorkPackageValidator : AbstractValidator<CreateWorkPackageCommand>
{
    public CreateWorkPackageValidator()
    {
        RuleFor(command => command.AgreementId).NotEmpty();
        RuleFor(command => command.ActorTenantId).NotEmpty();
        RuleFor(command => command.ActorUserId).NotEmpty();
        RuleFor(command => command.Title).NotEmpty();
        RuleFor(command => command.ProjectId).NotEmpty()
            .WithMessage("A work scope must name its project.");
        RuleFor(command => command.EpicId).NotEmpty()
            .WithMessage("A work scope must name its epic.");
    }
}

public sealed class OfferWorkPackageValidator : WorkPackageCommandValidator<OfferWorkPackageCommand>;

public sealed class AcceptWorkPackageValidator : WorkPackageCommandValidator<AcceptWorkPackageCommand>;

public sealed class StartWorkPackageProgressValidator
    : WorkPackageCommandValidator<StartWorkPackageProgressCommand>;

public sealed class RejectWorkPackageValidator : WorkPackageCommandValidator<RejectWorkPackageCommand>
{
    public RejectWorkPackageValidator() =>
        RuleFor(command => command.Reason)
            .NotEmpty()
            .WithMessage("A rejection must say why: the host can only act on a reason.");
}

public sealed class SubmitWorkPackageValidator : WorkPackageCommandValidator<SubmitWorkPackageCommand>
{
    public SubmitWorkPackageValidator() =>
        RuleFor(command => command.DeliverableRef)
            .NotEmpty()
            .WithMessage("A submission must point at what was delivered.");
}

public sealed class RequestWorkPackageChangesValidator
    : WorkPackageCommandValidator<RequestWorkPackageChangesCommand>
{
    public RequestWorkPackageChangesValidator() =>
        RuleFor(command => command.Reason)
            .NotEmpty()
            .WithMessage("Requesting changes must say what to change.");
}

public sealed class CompleteWorkPackageValidator : WorkPackageCommandValidator<CompleteWorkPackageCommand>
{
    public CompleteWorkPackageValidator() =>
        RuleFor(command => command.CompletionProofRef)
            .NotEmpty()
            .WithMessage("Completion must reference the proof it was accepted on.");
}

public sealed class CancelWorkPackageValidator : WorkPackageCommandValidator<CancelWorkPackageCommand>
{
    public CancelWorkPackageValidator() =>
        RuleFor(command => command.Reason)
            .NotEmpty()
            .WithMessage("A withdrawal the other party cannot explain to their own people is how a collaboration ends badly.");
}
