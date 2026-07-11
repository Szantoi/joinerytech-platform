using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Modules.CRM.Application.Commands.AddLeadActivity;
using SpaceOS.Modules.CRM.Application.Commands.AddLeadTask;
using SpaceOS.Modules.CRM.Application.Commands.ContactLead;
using SpaceOS.Modules.CRM.Application.Commands.ConvertLeadToOpportunity;
using SpaceOS.Modules.CRM.Application.Commands.CreateLead;
using SpaceOS.Modules.CRM.Application.Commands.DisqualifyLead;
using SpaceOS.Modules.CRM.Application.Commands.QualifyLead;
using SpaceOS.Modules.CRM.Application.Queries.GetLeadById;
using SpaceOS.Modules.CRM.Application.Queries.GetLeadsByStatus;

namespace SpaceOS.Modules.CRM.Api;

/// <summary>
/// Lead CRM endpoints (9 total)
/// </summary>
public static class LeadEndpoints
{
    public static IEndpointRouteBuilder MapLeadEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/crm/leads")
            .WithTags("CRM - Leads")
            .RequireAuthorization();

        // POST /api/crm/leads - CreateLead
        group.MapPost("/", CreateLead)
            .WithName("CreateLead")
            .WithSummary("Create a new lead")
            .Produces<Guid>(201)
            .ProducesValidationProblem()
            .ProducesProblem(400);

        // PUT /api/crm/leads/{id}/contact - ContactLead
        group.MapPut("/{id:guid}/contact", ContactLead)
            .WithName("ContactLead")
            .WithSummary("Mark lead as contacted (FSM: New → Contacted)")
            .Produces(204)
            .ProducesProblem(404)
            .ProducesProblem(400);

        // PUT /api/crm/leads/{id}/qualify - QualifyLead
        group.MapPut("/{id:guid}/qualify", QualifyLead)
            .WithName("QualifyLead")
            .WithSummary("Qualify lead (FSM: Contacted → Qualified)")
            .Produces(204)
            .ProducesProblem(404)
            .ProducesProblem(400);

        // PUT /api/crm/leads/{id}/disqualify - DisqualifyLead
        group.MapPut("/{id:guid}/disqualify", DisqualifyLead)
            .WithName("DisqualifyLead")
            .WithSummary("Disqualify lead with reason")
            .Produces(204)
            .ProducesValidationProblem()
            .ProducesProblem(404);

        // POST /api/crm/leads/{id}/convert - ConvertLeadToOpportunity
        group.MapPost("/{id:guid}/convert", ConvertLeadToOpportunity)
            .WithName("ConvertLeadToOpportunity")
            .WithSummary("Convert qualified lead to opportunity")
            .Produces<Guid>(201)
            .ProducesValidationProblem()
            .ProducesProblem(404)
            .ProducesProblem(400);

        // POST /api/crm/leads/{id}/activities - AddLeadActivity
        group.MapPost("/{id:guid}/activities", AddLeadActivity)
            .WithName("AddLeadActivity")
            .WithSummary("Add activity to lead")
            .Produces(204)
            .ProducesValidationProblem()
            .ProducesProblem(404);

        // POST /api/crm/leads/{id}/tasks - AddLeadTask
        group.MapPost("/{id:guid}/tasks", AddLeadTask)
            .WithName("AddLeadTask")
            .WithSummary("Add follow-up task to lead")
            .Produces(204)
            .ProducesValidationProblem()
            .ProducesProblem(404);

        // GET /api/crm/leads/{id} - GetLeadById
        group.MapGet("/{id:guid}", GetLeadById)
            .WithName("GetLeadById")
            .WithSummary("Get lead by ID")
            .Produces<Application.DTOs.LeadResponse>()
            .ProducesProblem(404)
            .ProducesProblem(403);

        // GET /api/crm/leads?status={status} - GetLeadsByStatus
        group.MapGet("/", GetLeadsByStatus)
            .WithName("GetLeadsByStatus")
            .WithSummary("Get leads by status (optional filter)")
            .Produces<List<Application.DTOs.LeadResponse>>()
            .ProducesProblem(403);

        return app;
    }

    private static async Task<IResult> CreateLead(
        [FromBody] CreateLeadRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new CreateLeadCommand
        {
            Name = request.Name,
            Email = request.Email,
            Phone = request.Phone,
            Company = request.Company,
            Source = request.Source,
            AssignedTo = request.AssignedTo,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.Created($"/api/crm/leads/{result.Value}", result.Value)
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> ContactLead(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new ContactLeadCommand
        {
            LeadId = id,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> QualifyLead(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new QualifyLeadCommand
        {
            LeadId = id,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> DisqualifyLead(
        [FromRoute] Guid id,
        [FromBody] DisqualifyLeadRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new DisqualifyLeadCommand
        {
            LeadId = id,
            Reason = request.Reason,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> ConvertLeadToOpportunity(
        [FromRoute] Guid id,
        [FromBody] ConvertLeadRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new ConvertLeadToOpportunityCommand
        {
            LeadId = id,
            EstimatedValue = request.EstimatedValue,
            Currency = request.Currency,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.Created($"/api/crm/opportunities/{result.Value}", result.Value)
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> AddLeadActivity(
        [FromRoute] Guid id,
        [FromBody] AddActivityRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new AddLeadActivityCommand
        {
            LeadId = id,
            ActivityType = request.Type,
            Description = request.Description,
            CreatedBy = userId,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> AddLeadTask(
        [FromRoute] Guid id,
        [FromBody] AddTaskRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new AddLeadTaskCommand
        {
            LeadId = id,
            Title = request.Title,
            DueDate = request.DueDate,
            Priority = request.Priority,
            CreatedBy = userId,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> GetLeadById(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetLeadByIdQuery
        {
            LeadId = id,
            TenantId = tenantId
        };

        var result = await mediator.Send(query, ct);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : result.Status == Ardalis.Result.ResultStatus.Forbidden
                    ? Results.Forbid()
                    : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> GetLeadsByStatus(
        [FromQuery] string? status,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetLeadsByStatusQuery
        {
            Status = status ?? string.Empty,
            TenantId = tenantId
        };

        var result = await mediator.Send(query, ct);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : result.Status == Ardalis.Result.ResultStatus.Forbidden
                ? Results.Forbid()
                : Results.BadRequest(result.Errors);
    }
}

// Request DTOs
public record CreateLeadRequest(
    string Name,
    string Email,
    string? Phone,
    string? Company,
    string Source,
    Guid AssignedTo
);

public record DisqualifyLeadRequest(string Reason);

public record ConvertLeadRequest(decimal EstimatedValue, string Currency);

public record AddActivityRequest(string Type, string Description);

public record AddTaskRequest(string Title, DateTime DueDate, string Priority);
