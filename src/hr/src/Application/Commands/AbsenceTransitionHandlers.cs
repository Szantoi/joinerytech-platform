using Microsoft.Extensions.Logging;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Repositories;

namespace SpaceOS.Modules.HR.Application.Commands;

/// <summary>
/// Handlers for the Absence FSM transitions. Each one only names its aggregate action —
/// loading, FSM/error mapping, persistence, logging and the fresh-DTO response all live
/// in <see cref="AbsenceTransitionHandlerBase{TCommand}"/> (Maintenance precedent).
/// </summary>
public class ApproveAbsenceCommandHandler : AbsenceTransitionHandlerBase<ApproveAbsenceCommand>
{
    public ApproveAbsenceCommandHandler(
        IAbsenceRepository absenceRepository,
        IEmployeeRepository employeeRepository,
        ILogger<ApproveAbsenceCommandHandler> logger)
        : base(absenceRepository, employeeRepository, logger)
    {
    }

    protected override string ActionName => "approve";

    protected override void Apply(Absence absence, ApproveAbsenceCommand request)
        => absence.Approve(request.ApprovedByUserId);
}

public class RejectAbsenceCommandHandler : AbsenceTransitionHandlerBase<RejectAbsenceCommand>
{
    public RejectAbsenceCommandHandler(
        IAbsenceRepository absenceRepository,
        IEmployeeRepository employeeRepository,
        ILogger<RejectAbsenceCommandHandler> logger)
        : base(absenceRepository, employeeRepository, logger)
    {
    }

    protected override string ActionName => "reject";

    protected override void Apply(Absence absence, RejectAbsenceCommand request)
        => absence.Reject(request.RejectedByUserId, request.RejectionReason);
}

public class StartAbsenceCommandHandler : AbsenceTransitionHandlerBase<StartAbsenceCommand>
{
    public StartAbsenceCommandHandler(
        IAbsenceRepository absenceRepository,
        IEmployeeRepository employeeRepository,
        ILogger<StartAbsenceCommandHandler> logger)
        : base(absenceRepository, employeeRepository, logger)
    {
    }

    protected override string ActionName => "start";

    protected override void Apply(Absence absence, StartAbsenceCommand request)
        => absence.StartAbsence();
}

public class CompleteAbsenceCommandHandler : AbsenceTransitionHandlerBase<CompleteAbsenceCommand>
{
    public CompleteAbsenceCommandHandler(
        IAbsenceRepository absenceRepository,
        IEmployeeRepository employeeRepository,
        ILogger<CompleteAbsenceCommandHandler> logger)
        : base(absenceRepository, employeeRepository, logger)
    {
    }

    protected override string ActionName => "complete";

    protected override void Apply(Absence absence, CompleteAbsenceCommand request)
        => absence.CompleteAbsence();
}

public class ReopenAbsenceCommandHandler : AbsenceTransitionHandlerBase<ReopenAbsenceCommand>
{
    public ReopenAbsenceCommandHandler(
        IAbsenceRepository absenceRepository,
        IEmployeeRepository employeeRepository,
        ILogger<ReopenAbsenceCommandHandler> logger)
        : base(absenceRepository, employeeRepository, logger)
    {
    }

    protected override string ActionName => "reopen";

    protected override void Apply(Absence absence, ReopenAbsenceCommand request)
        => absence.Reopen();
}
