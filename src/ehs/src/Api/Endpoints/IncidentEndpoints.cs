using MediatR;
using Microsoft.AspNetCore.Mvc;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Incidents.Commands.AddCorrectiveAction;
using SpaceOS.Modules.Ehs.Application.Incidents.Commands.AddInvestigationFindings;
using SpaceOS.Modules.Ehs.Application.Incidents.Commands.CloseIncident;
using SpaceOS.Modules.Ehs.Application.Incidents.Commands.CreateIncident;
using SpaceOS.Modules.Ehs.Application.Incidents.Commands.StartInvestigation;
using SpaceOS.Modules.Ehs.Application.Incidents.Queries.GetIncidentById;
using SpaceOS.Modules.Ehs.Application.Incidents.Queries.ListIncidents;
using SpaceOS.Modules.Ehs.Application.Wire;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Api.Endpoints;

/// <summary>
/// Incident endpoints registration.
/// </summary>
public static class IncidentEndpoints
{
    public static void MapIncidentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ehs/incidents")
            .WithTags("Incidents")
            .WithOpenApi()
            .RequireAuthorization();

        // POST /api/ehs/incidents
        group.MapPost("/", CreateIncident)
            .WithName("CreateIncident")
            .WithSummary("Create a new incident report")
            .Produces<Guid>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        // GET /api/ehs/incidents/{id}
        group.MapGet("/{id:guid}", GetIncident)
            .WithName("GetIncident")
            .WithSummary("Get incident by ID")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        // GET /api/ehs/incidents
        group.MapGet("/", ListIncidents)
            .WithName("ListIncidents")
            .WithSummary("List incidents with optional filters")
            .Produces(StatusCodes.Status200OK);

        // POST /api/ehs/incidents/{id}/start-investigation
        group.MapPost("/{id:guid}/start-investigation", StartInvestigation)
            .WithName("StartInvestigation")
            .WithSummary("Start an investigation for an incident")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        // POST /api/ehs/incidents/{id}/add-findings
        group.MapPost("/{id:guid}/add-findings", AddFindings)
            .WithName("AddInvestigationFindings")
            .WithSummary("Add investigation findings to an incident")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        // POST /api/ehs/incidents/{id}/add-corrective-action
        group.MapPost("/{id:guid}/add-corrective-action", AddCorrectiveAction)
            .WithName("AddCorrectiveAction")
            .WithSummary("Add a corrective action to an incident")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        // POST /api/ehs/incidents/{id}/close
        group.MapPost("/{id:guid}/close", CloseIncident)
            .WithName("CloseIncident")
            .WithSummary("Close an incident")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest);
    }

    private static async Task<IResult> CreateIncident(
        [FromBody] CreateIncidentRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new CreateIncidentCommand(
                tenantContext.TenantId,
                request.IncidentType,
                request.IncidentDate,
                request.Location,
                request.Description,
                request.Severity,
                request.ReportedBy
            );

            var incidentId = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/incidents/{incidentId}", new { IncidentId = incidentId });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> GetIncident(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var query = new GetIncidentByIdQuery(id, tenantContext.TenantId);
            var result = await mediator.Send(query, ct).ConfigureAwait(false);
            return Results.Ok(result);
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> ListIncidents(
        [AsParameters] ListIncidentsRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        // Query-string enums bypass the JSON converters — parse the Hungarian
        // wire keys by hand (ADR-059); unknown key → 400, not an empty list.
        if (!WireQuery.TryParse(EhsWire.IncidentType, request.IncidentType, "eseménytípus", out var incidentType, out var typeError))
            return typeError!;
        if (!WireQuery.TryParse(EhsWire.IncidentStatus, request.Status, "esemény-státusz", out var status, out var statusError))
            return statusError!;
        if (!WireQuery.TryParse(EhsWire.Severity, request.MinSeverity, "súlyosság", out var minSeverity, out var severityError))
            return severityError!;

        var filter = new IncidentFilter(
            incidentType,
            status,
            request.DateFrom,
            request.DateTo,
            minSeverity
        );

        var query = new ListIncidentsQuery(tenantContext.TenantId, filter);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> StartInvestigation(
        Guid id,
        [FromBody] StartInvestigationRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new StartInvestigationCommand(
                id,
                tenantContext.TenantId,
                request.InvestigatedBy
            );

            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> AddFindings(
        Guid id,
        [FromBody] AddInvestigationFindingsRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new AddInvestigationFindingsCommand(
                id,
                tenantContext.TenantId,
                request.Findings,
                request.RootCause,
                request.Recommendations
            );

            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> AddCorrectiveAction(
        Guid id,
        [FromBody] AddCorrectiveActionRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new AddCorrectiveActionCommand(
                id,
                tenantContext.TenantId,
                request.Description,
                request.AssignedTo,
                request.DueDate
            );

            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> CloseIncident(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new CloseIncidentCommand(id, tenantContext.TenantId);
            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }
}

// Request DTOs
public record CreateIncidentRequest(
    Domain.Enums.IncidentType IncidentType,
    DateTimeOffset IncidentDate,
    string Location,
    string Description,
    Domain.Enums.Severity Severity,
    Guid ReportedBy
);

/// <summary>
/// List filter — enum filters travel as raw strings and are parsed against
/// the EhsWire maps in the handler (ADR-059 Hungarian wire keys).
/// </summary>
public record ListIncidentsRequest(
    string? IncidentType = null,
    string? Status = null,
    DateTimeOffset? DateFrom = null,
    DateTimeOffset? DateTo = null,
    string? MinSeverity = null
);

public record StartInvestigationRequest(Guid InvestigatedBy);
public record AddInvestigationFindingsRequest(string Findings, string RootCause, string? Recommendations);
public record AddCorrectiveActionRequest(string Description, Guid AssignedTo, DateTimeOffset DueDate);
