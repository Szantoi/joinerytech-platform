using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Application.Commands;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Application.Queries;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Api.Endpoints;

/// <summary>
/// Absence API endpoints (Minimal API; portal MSW contract mirror:
/// src/joinerytech-portal/src/modules/hr/mocks/handlers.absences.ts).
///
/// FSM: Pending → Approved | Rejected; Approved → InProgress; InProgress → Completed
/// (terminal); Rejected → Pending (reopen). Every FSM action is a DEDICATED endpoint
/// (no generic PATCH status), and each returns the fresh AbsenceDto — the portal
/// reconciles its optimistic update from the response body.
///
/// Error contract: 404 = not found, 409 = forbidden FSM transition,
/// 400 = payload validation (e.g. reject without a reason).
///
/// NOTE: approve/reject are meant to be `hr.manage`-gated. There is no permission
/// model in the platform yet, so the decision maker's user id travels in the payload;
/// the gate is a documented follow-up (HR-BE-HOST.md).
/// </summary>
public static class AbsenceEndpoints
{
    private const string LoggerCategory = "SpaceOS.Modules.HR.Api.AbsenceEndpoints";

    /// <summary>Maps the absence endpoints to the application.</summary>
    public static IEndpointRouteBuilder MapAbsenceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/absences")
            .WithTags("HR - Absences")
            .RequireAuthorization();

        group.MapGet("", ListAbsences)
            .WithName("ListAbsences")
            .WithSummary("List absences (filters: status, empId; newest first)")
            .Produces<AbsenceDto[]>(200)
            .Produces(400);

        group.MapGet("/{id:guid}", GetAbsence)
            .WithName("GetAbsence")
            .WithSummary("Get absence by ID")
            .Produces<AbsenceDto>(200)
            .Produces(404);

        group.MapPost("", RequestAbsence)
            .WithName("RequestAbsence")
            .WithSummary("Request a new absence (FSM entry: Pending)")
            .Produces<AbsenceDto>(201)
            .Produces(400)
            .Produces(404);

        group.MapPut("/{id:guid}/approve", ApproveAbsence)
            .WithName("ApproveAbsence")
            .WithSummary("Approve the request (FSM: Pending → Approved)")
            .Produces<AbsenceDto>(200)
            .Produces(400)
            .Produces(404)
            .Produces(409);

        group.MapPut("/{id:guid}/reject", RejectAbsence)
            .WithName("RejectAbsence")
            .WithSummary("Reject the request with a mandatory reason (FSM: Pending → Rejected)")
            .Produces<AbsenceDto>(200)
            .Produces(400)
            .Produces(404)
            .Produces(409);

        group.MapPut("/{id:guid}/start", StartAbsence)
            .WithName("StartAbsence")
            .WithSummary("Start the absence period (FSM: Approved → InProgress)")
            .Produces<AbsenceDto>(200)
            .Produces(404)
            .Produces(409);

        group.MapPut("/{id:guid}/complete", CompleteAbsence)
            .WithName("CompleteAbsence")
            .WithSummary("Close the absence period (FSM: InProgress → Completed)")
            .Produces<AbsenceDto>(200)
            .Produces(404)
            .Produces(409);

        group.MapPut("/{id:guid}/reopen", ReopenAbsence)
            .WithName("ReopenAbsence")
            .WithSummary("Reopen a rejected request (FSM: Rejected → Pending; clears the rejection)")
            .Produces<AbsenceDto>(200)
            .Produces(404)
            .Produces(409);

        return app;
    }

    // ============ QUERIES ============

    private static async Task<IResult> ListAbsences(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromQuery(Name = "status")] string? status,
        [FromQuery(Name = "empId")] Guid? empId,
        CancellationToken ct)
    {
        AbsenceStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<AbsenceStatus>(status, ignoreCase: true, out var parsedStatus))
            {
                return Results.BadRequest(new { error = "Invalid status filter" });
            }
            statusFilter = parsedStatus;
        }

        var query = new GetAbsencesQuery(
            TenantId: TenantId.From(tenantId),
            Status: statusFilter,
            EmployeeId: empId.HasValue ? EmployeeId.From(empId.Value) : null);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : HrEndpointResults.Failure(result);
    }

    private static async Task<IResult> GetAbsence(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        CancellationToken ct)
    {
        var result = await mediator
            .Send(new GetAbsenceQuery(AbsenceId.From(id)), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : HrEndpointResults.Failure(result);
    }

    // ============ FSM ENTRY ============

    private static async Task<IResult> RequestAbsence(
        [FromBody] RequestAbsenceRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!Enum.TryParse<AbsenceType>(request.Type, ignoreCase: true, out var type))
        {
            return Results.BadRequest(new { error = "Invalid absence type" });
        }

        var command = new RequestAbsenceCommand
        {
            TenantId = tenantId,
            EmployeeId = EmployeeId.From(request.EmployeeId),
            Type = type,
            StartDate = request.StartDate.ToDateTime(TimeOnly.MinValue),
            EndDate = request.EndDate.ToDateTime(TimeOnly.MinValue),
            Reason = request.Reason
        };

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return HrEndpointResults.Failure(result);
        }

        loggerFactory.CreateLogger(LoggerCategory).LogInformation(
            "Absence {AbsenceId} requested ({Type}) for employee {EmployeeId}, tenant {TenantId}",
            result.Value.Value, type, request.EmployeeId, tenantId);

        var fresh = await mediator
            .Send(new GetAbsenceQuery(result.Value), ct)
            .ConfigureAwait(false);

        return fresh.IsSuccess
            ? Results.Created($"/api/hr/absences/{result.Value.Value}", fresh.Value)
            : HrEndpointResults.Failure(fresh);
    }

    // ============ FSM TRANSITIONS ============

    private static Task<IResult> ApproveAbsence(
        [FromRoute] Guid id,
        [FromBody] ApproveAbsenceRequestDto request,
        [FromServices] IMediator mediator,
        CancellationToken ct)
        => ExecuteTransition(
            mediator,
            new ApproveAbsenceCommand
            {
                AbsenceId = AbsenceId.From(id),
                ApprovedByUserId = request.ApprovedBy
            },
            ct);

    private static Task<IResult> RejectAbsence(
        [FromRoute] Guid id,
        [FromBody] RejectAbsenceRequestDto request,
        [FromServices] IMediator mediator,
        CancellationToken ct)
        => ExecuteTransition(
            mediator,
            new RejectAbsenceCommand
            {
                AbsenceId = AbsenceId.From(id),
                RejectedByUserId = request.RejectedBy,
                // The aggregate enforces the mandatory reason (empty → DomainException → 400).
                RejectionReason = request.Reason ?? string.Empty
            },
            ct);

    private static Task<IResult> StartAbsence(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        CancellationToken ct)
        => ExecuteTransition(mediator, new StartAbsenceCommand { AbsenceId = AbsenceId.From(id) }, ct);

    private static Task<IResult> CompleteAbsence(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        CancellationToken ct)
        => ExecuteTransition(mediator, new CompleteAbsenceCommand { AbsenceId = AbsenceId.From(id) }, ct);

    private static Task<IResult> ReopenAbsence(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        CancellationToken ct)
        => ExecuteTransition(mediator, new ReopenAbsenceCommand { AbsenceId = AbsenceId.From(id) }, ct);

    /// <summary>
    /// Shared transition execution: the handler pipeline already returns the fresh DTO
    /// (and does the logging), so the endpoint only maps the result to HTTP.
    /// </summary>
    private static async Task<IResult> ExecuteTransition(
        IMediator mediator,
        IRequest<Ardalis.Result.Result<AbsenceDto>> command,
        CancellationToken ct)
    {
        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : HrEndpointResults.Failure(result);
    }
}

/// <summary>
/// Request DTOs for the absence operations (module pattern: enums as strings,
/// parsed with Enum.TryParse — invalid values → 400).
/// </summary>
public record RequestAbsenceRequestDto(
    Guid EmployeeId,
    string Type,
    DateOnly StartDate,
    DateOnly EndDate,
    string Reason
);

/// <summary>
/// The approver's user id. Travels in the payload until the platform has an
/// authenticated-user/permission model (`hr.manage` follow-up).
/// </summary>
public record ApproveAbsenceRequestDto(Guid ApprovedBy);

/// <summary>The rejecter's user id + the mandatory reason (portal contract: missing reason → 400).</summary>
public record RejectAbsenceRequestDto(Guid RejectedBy, string? Reason);
