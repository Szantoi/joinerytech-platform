using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Application.Wire;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Api.Endpoints;

/// <summary>
/// Lead API endpoints (Minimal API), mirroring the portal MSW contract
/// (<c>modules/crm/mocks/handlers.leads.ts</c>).
///
/// FSM (LEAD_FSM): New → Contacted → Qualified → Nurturing → Opportunity
/// (+ Disqualified from any open state). The <c>nurture</c> branch was the
/// documented backend gap (F2-CRM-FE) — closed by CRM-BE-HOST.
///
/// Transition endpoints are PUT and return the FRESH LeadDto (200): the portal
/// reconciles its optimistic update from the response body.
///
/// Error contract: 404 = unknown id, 409 = illegal FSM transition,
/// 400 = payload guard (e.g. discard without a reason).
/// </summary>
public static class LeadEndpoints
{
    private const string LoggerCategory = "SpaceOS.Modules.CRM.Api.LeadEndpoints";
    private const string RouteBase = "/api/crm/leads";
    private const string DefaultCurrency = "HUF";

    public static IEndpointRouteBuilder MapLeadEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup(RouteBase)
            .WithTags("CRM - Leads")
            .RequireAuthorization();

        group.MapPost("", CreateLead)
            .WithName("CreateLead")
            .WithSummary("Create a lead (FSM entry: New / uj)")
            .Produces<LeadDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest);

        group.MapGet("", ListLeads)
            .WithName("ListLeads")
            .WithSummary("List leads (filters: status, q; newest first)")
            .Produces<LeadDto[]>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest);

        group.MapGet("/{id:guid}", GetLead)
            .WithName("GetLead")
            .WithSummary("Get lead by id")
            .Produces<LeadDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        group.MapPut("/{id:guid}/contact", ContactLead)
            .WithName("ContactLead")
            .WithSummary("FSM: New → Contacted (uj → kapcsolat)")
            .Produces<LeadDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}/qualify", QualifyLead)
            .WithName("QualifyLead")
            .WithSummary("FSM: Contacted → Qualified (kapcsolat → minosites)")
            .Produces<LeadDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}/nurture", NurtureLead)
            .WithName("NurtureLead")
            .WithSummary("FSM: Qualified → Nurturing (minosites → nurturing)")
            .Produces<LeadDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}/discard", DiscardLead)
            .WithName("DiscardLead")
            .WithSummary("FSM: any open state → Disqualified (elvetve); reason is mandatory")
            .Produces<LeadDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPost("/{id:guid}/convert", ConvertLead)
            .WithName("ConvertLeadToOpportunity")
            .WithSummary("FSM: Qualified/Nurturing → Opportunity + creates the opportunity")
            .Produces<ConvertLeadResponseDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPost("/{id:guid}/activities", LogActivity)
            .WithName("LogLeadActivity")
            .WithSummary("Append an activity log entry; returns the fresh lead")
            .Produces<LeadDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound);

        return app;
    }

    // ══════════ Handlers ══════════

    private static async Task<Microsoft.AspNetCore.Http.IResult> CreateLead(
        [FromBody] CreateLeadRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
    {
        if (!CrmWire.LeadSource.TryParse(request.Source, out var source))
        {
            return CrmEndpointResults.BadRequest(
                $"Invalid lead source '{request.Source}'. Lehetséges értékek: " +
                $"{string.Join(", ", CrmWire.LeadSource.Spellings)}.");
        }

        var command = new CreateLeadCommand
        {
            TenantId = tenantId,
            ContactName = request.ContactName,
            Email = request.Email,
            Phone = request.Phone,
            Company = request.Company,
            Source = source,
            AssignedToUserId = request.AssignedToUserId,
            CreatedBy = request.CreatedBy
        };

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return CrmEndpointResults.Failure(result);
        }

        loggerFactory.CreateLogger(LoggerCategory).LogInformation(
            "CRM lead {LeadId} created ({Source}) for tenant {TenantId}",
            result.Value.Id, source, tenantId);

        return Results.Created($"{RouteBase}/{result.Value.Id}", result.Value);
    }

    private static async Task<Microsoft.AspNetCore.Http.IResult> ListLeads(
        [FromServices] IMediator mediator,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        [FromQuery(Name = "status")] string? status,
        [FromQuery(Name = "q")] string? q,
        CancellationToken ct)
    {
        LeadStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!CrmWire.LeadStatus.TryParse(status, out var parsed))
            {
                return CrmEndpointResults.BadRequest(
                    $"Invalid status filter '{status}'. Lehetséges értékek: " +
                    $"{string.Join(", ", CrmWire.LeadStatus.Spellings)}.");
            }
            statusFilter = parsed;
        }

        var query = new GetLeadsQuery
        {
            TenantId = tenantId,
            StatusFilter = statusFilter?.ToString(),
            SearchText = q
        };

        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value.Data)
            : CrmEndpointResults.Failure(result);
    }

    private static async Task<Microsoft.AspNetCore.Http.IResult> GetLead(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
    {
        var result = await mediator
            .Send(new GetLeadByIdQuery { TenantId = tenantId, LeadId = id }, ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : CrmEndpointResults.Failure(result);
    }

    private static Task<Microsoft.AspNetCore.Http.IResult> ContactLead(
        [FromRoute] Guid id,
        [FromBody] LeadNoteRequestDto? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
        => ExecuteTransition(
            mediator, loggerFactory,
            new ContactLeadCommand
            {
                TenantId = tenantId,
                LeadId = id,
                Notes = request?.Note,
                ActedBy = request?.ActedBy ?? Guid.Empty
            },
            id, tenantId, "contact", ct);

    private static Task<Microsoft.AspNetCore.Http.IResult> QualifyLead(
        [FromRoute] Guid id,
        [FromBody] LeadNoteRequestDto? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
        => ExecuteTransition(
            mediator, loggerFactory,
            new QualifyLeadCommand
            {
                TenantId = tenantId,
                LeadId = id,
                QualificationNotes = request?.Note,
                ActedBy = request?.ActedBy ?? Guid.Empty
            },
            id, tenantId, "qualify", ct);

    private static Task<Microsoft.AspNetCore.Http.IResult> NurtureLead(
        [FromRoute] Guid id,
        [FromBody] LeadNoteRequestDto? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
        => ExecuteTransition(
            mediator, loggerFactory,
            new NurtureLeadCommand
            {
                TenantId = tenantId,
                LeadId = id,
                Notes = request?.Note,
                ActedBy = request?.ActedBy ?? Guid.Empty
            },
            id, tenantId, "nurture", ct);

    private static async Task<Microsoft.AspNetCore.Http.IResult> DiscardLead(
        [FromRoute] Guid id,
        [FromBody] DiscardLeadRequestDto? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
    {
        // Payload guard before the FSM guard — the portal MSW returns 400 here.
        if (string.IsNullOrWhiteSpace(request?.Reason))
        {
            return CrmEndpointResults.BadRequest("Az elvetés indoka kötelező.");
        }

        return await ExecuteTransition(
                mediator, loggerFactory,
                new DisqualifyLeadCommand
                {
                    TenantId = tenantId,
                    LeadId = id,
                    Reason = request.Reason,
                    ActedBy = request.ActedBy
                },
                id, tenantId, "discard", ct)
            .ConfigureAwait(false);
    }

    private static async Task<Microsoft.AspNetCore.Http.IResult> ConvertLead(
        [FromRoute] Guid id,
        [FromBody] ConvertLeadRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
    {
        var command = new ConvertToOpportunityCommand
        {
            TenantId = tenantId,
            LeadId = id,
            CustomerId = request.CustomerId,
            Title = request.Title,
            EstimatedValue = request.EstimatedValue,
            Currency = request.Currency ?? DefaultCurrency,
            ExpectedCloseDate = request.ExpectedCloseDate,
            ConvertedBy = request.ConvertedBy
        };

        var logger = loggerFactory.CreateLogger(LoggerCategory);

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            logger.LogWarning(
                "CRM lead {LeadId} convert rejected ({Status}) for tenant {TenantId}",
                id, result.Status, tenantId);

            return CrmEndpointResults.Failure(result);
        }

        logger.LogInformation(
            "CRM lead {LeadId} converted to opportunity {OpportunityId} for tenant {TenantId}",
            id, result.Value.OpportunityRef, tenantId);

        var response = new ConvertLeadResponseDto(result.Value, result.Value.OpportunityRef!.Value);

        return Results.Created($"{RouteBase}/{id}", response);
    }

    private static async Task<Microsoft.AspNetCore.Http.IResult> LogActivity(
        [FromRoute] Guid id,
        [FromBody] LogActivityRequestDto? request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request?.Description))
        {
            return CrmEndpointResults.BadRequest("A bejegyzés szövege kötelező.");
        }

        var command = new LogLeadActivityCommand
        {
            TenantId = tenantId,
            LeadId = id,
            ActivityType = request.Type,
            Description = request.Description,
            LoggedBy = request.LoggedBy
        };

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Created($"{RouteBase}/{id}", result.Value)
            : CrmEndpointResults.Failure(result);
    }

    /// <summary>
    /// Shared transition execution: run the command and, on success, return the
    /// fresh LeadDto (200) the portal reconciles against; on failure map through
    /// the module error contract (404 / 409 / 400).
    /// </summary>
    private static async Task<Microsoft.AspNetCore.Http.IResult> ExecuteTransition(
        IMediator mediator,
        ILoggerFactory loggerFactory,
        IRequest<Ardalis.Result.Result<LeadDto>> command,
        Guid id,
        Guid tenantId,
        string action,
        CancellationToken ct)
    {
        var logger = loggerFactory.CreateLogger(LoggerCategory);

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        if (!result.IsSuccess)
        {
            logger.LogWarning(
                "CRM lead {LeadId} {Action} rejected ({Status}) for tenant {TenantId}",
                id, action, result.Status, tenantId);

            return CrmEndpointResults.Failure(result);
        }

        logger.LogInformation(
            "CRM lead {LeadId} {Action} succeeded for tenant {TenantId}",
            id, action, tenantId);

        return Results.Ok(result.Value);
    }
}

// ══════════ Request / response DTOs ══════════

/// <summary>Header names shared by the CRM endpoints.</summary>
public static class CrmApiHeaders
{
    /// <summary>Tenant scope of the request (QA module precedent).</summary>
    public const string TenantId = "X-Tenant-Id";
}

/// <summary>
/// Create-lead payload (enums travel as strings and are parsed with TryParse —
/// an unknown value is a 400, never a silent default).
/// </summary>
public record CreateLeadRequestDto(
    string ContactName,
    string Email,
    string? Phone,
    string? Company,
    string Source,
    Guid AssignedToUserId,
    Guid CreatedBy
);

/// <summary>Optional note carried by the simple lead transitions.</summary>
public record LeadNoteRequestDto(string? Note, Guid ActedBy);

/// <summary>Discard payload — the reason is mandatory (400 without it).</summary>
public record DiscardLeadRequestDto(string Reason, Guid ActedBy);

/// <summary>
/// Convert payload. The customer id and the deal figures come from the caller:
/// this module has no customer directory and does not invent one
/// (CRM-BE-HOST follow-up #2).
/// </summary>
public record ConvertLeadRequestDto(
    Guid CustomerId,
    string Title,
    decimal EstimatedValue,
    string? Currency,
    DateTime? ExpectedCloseDate,
    Guid ConvertedBy
);

/// <summary>Convert result: the fresh lead + the id of the created opportunity.</summary>
public record ConvertLeadResponseDto(LeadDto Lead, Guid OpportunityId);

/// <summary>Activity log entry payload.</summary>
public record LogActivityRequestDto(string Type, string Description, Guid LoggedBy);
