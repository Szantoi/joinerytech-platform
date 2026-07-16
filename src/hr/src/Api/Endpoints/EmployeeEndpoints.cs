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
/// Employee API endpoints (Minimal API; portal MSW contract mirror:
/// src/joinerytech-portal/src/modules/hr/mocks/handlers.employees.ts).
/// Read-only master data plus the skill-matrix mutation — the portal's people and
/// skills screens filter SERVER-side (dept / q / skill).
/// Error contract: 404 = not found, 400 = invalid filter/payload.
/// </summary>
public static class EmployeeEndpoints
{
    private const string LoggerCategory = "SpaceOS.Modules.HR.Api.EmployeeEndpoints";

    /// <summary>Maps the employee endpoints to the application.</summary>
    public static IEndpointRouteBuilder MapEmployeeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/employees")
            .WithTags("HR - Employees")
            .RequireAuthorization();

        group.MapGet("", ListEmployees)
            .WithName("ListEmployees")
            .WithSummary("List employees (filters: dept, q, skill, active; by name)")
            .Produces<EmployeeDto[]>(200)
            .Produces(400);

        group.MapGet("/{id:guid}", GetEmployee)
            .WithName("GetEmployee")
            .WithSummary("Get employee by ID (includes skills)")
            .Produces<EmployeeDto>(200)
            .Produces(404);

        group.MapPut("/{id:guid}/skills", UpdateEmployeeSkills)
            .WithName("UpdateEmployeeSkills")
            .WithSummary("Update the employee's skill set (skill matrix); returns the fresh employee")
            .Produces<EmployeeDto>(200)
            .Produces(400)
            .Produces(404);

        return app;
    }

    // ============ HANDLERS ============

    private static async Task<IResult> ListEmployees(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromQuery(Name = "dept")] string? dept,
        [FromQuery(Name = "q")] string? q,
        [FromQuery(Name = "skill")] string? skill,
        [FromQuery(Name = "active")] bool? active,
        CancellationToken ct)
    {
        // Module pattern: enums travel as strings, parsed with TryParse — invalid → 400.
        Department? departmentFilter = null;
        if (!string.IsNullOrWhiteSpace(dept))
        {
            if (!Enum.TryParse<Department>(dept, ignoreCase: true, out var parsedDept))
            {
                return Results.BadRequest(new { error = "Invalid department filter" });
            }
            departmentFilter = parsedDept;
        }

        SkillKey? skillFilter = null;
        if (!string.IsNullOrWhiteSpace(skill))
        {
            if (!Enum.TryParse<SkillKey>(skill, ignoreCase: true, out var parsedSkill))
            {
                return Results.BadRequest(new { error = "Invalid skill filter" });
            }
            skillFilter = parsedSkill;
        }

        var query = new GetEmployeesQuery(
            TenantId: TenantId.From(tenantId),
            Department: departmentFilter,
            Skill: skillFilter,
            SearchText: q,
            ActiveOnly: active ?? true);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : HrEndpointResults.Failure(result);
    }

    private static async Task<IResult> GetEmployee(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        CancellationToken ct)
    {
        var result = await mediator
            .Send(new GetEmployeeQuery(EmployeeId.From(id)), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : HrEndpointResults.Failure(result);
    }

    private static async Task<IResult> UpdateEmployeeSkills(
        [FromRoute] Guid id,
        [FromBody] UpdateEmployeeSkillsRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        CancellationToken ct)
    {
        var toUpdate = new Dictionary<SkillKey, SkillLevel>();
        foreach (var skill in request.Skills ?? new List<EmployeeSkillRequestDto>())
        {
            if (!Enum.TryParse<SkillKey>(skill.Key, ignoreCase: true, out var key))
            {
                return Results.BadRequest(new { error = $"Invalid skill key: {skill.Key}" });
            }
            // Portal contract (ADR-060 §5): the level is a NUMBER, 1 = basic .. 3 = master.
            if (!Enum.IsDefined(typeof(SkillLevel), skill.Level))
            {
                return Results.BadRequest(new { error = $"Invalid skill level: {skill.Level}" });
            }
            toUpdate[key] = (SkillLevel)skill.Level;
        }

        var toRemove = new List<SkillKey>();
        foreach (var key in request.RemoveSkills ?? new List<string>())
        {
            if (!Enum.TryParse<SkillKey>(key, ignoreCase: true, out var parsed))
            {
                return Results.BadRequest(new { error = $"Invalid skill key: {key}" });
            }
            toRemove.Add(parsed);
        }

        var command = new UpdateEmployeeSkillsCommand
        {
            EmployeeId = EmployeeId.From(id),
            SkillsToUpdate = toUpdate,
            SkillsToRemove = toRemove
        };

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        var logger = loggerFactory.CreateLogger(LoggerCategory);

        if (!result.IsSuccess)
        {
            logger.LogWarning(
                "Employee {EmployeeId} skill update rejected ({Status})", id, result.Status);
            return HrEndpointResults.Failure(result);
        }

        logger.LogInformation(
            "Employee {EmployeeId} skills updated ({Updated} set, {Removed} removed)",
            id, toUpdate.Count, toRemove.Count);

        // Portal contract: the mutation answers with the fresh entity (optimistic reconcile).
        var fresh = await mediator
            .Send(new GetEmployeeQuery(EmployeeId.From(id)), ct)
            .ConfigureAwait(false);

        return fresh.IsSuccess
            ? Results.Ok(fresh.Value)
            : HrEndpointResults.Failure(fresh);
    }
}

/// <summary>
/// Request DTO for the skill-matrix update (module pattern: enums as strings —
/// except the level, which is a NUMBER 1..3 per the portal contract, ADR-060 §5).
/// </summary>
public record UpdateEmployeeSkillsRequestDto(
    List<EmployeeSkillRequestDto>? Skills,
    List<string>? RemoveSkills
);

public record EmployeeSkillRequestDto(string Key, int Level);
