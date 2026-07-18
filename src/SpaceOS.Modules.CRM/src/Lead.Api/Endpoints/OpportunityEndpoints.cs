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
using SpaceOS.Modules.CRM.Domain.FSM;

namespace SpaceOS.Modules.CRM.Api.Endpoints;

/// <summary>
/// Opportunity API endpoints (Minimal API), mirroring the portal MSW contract
/// (<c>modules/crm/mocks/handlers.opps.ts</c>).
///
/// FSM (OPP_FSM), with the portal's route segments:
///   start-discovery → Open → NeedsAssessment       (nyitott → igenyfelmeres)
///   start-proposal  → NeedsAssessment → SolutionAssembly
///   send-quote      → SolutionAssembly → Proposal  (osszeallitas → ajanlat)
///   negotiate       → Proposal → Negotiation       (ajanlat → targyalas)
///   win             → Negotiation → Won            (targyalas → megnyert)
///   lose            → any open stage → Lost        (mandatory reason)
///
/// Transition endpoints are PUT and return the FRESH OpportunityDto (200).
/// Error contract: 404 / 409 (illegal transition) / 400 (payload guard).
///
/// NOT implemented: <c>POST /opportunities/{id}/quote</c> (the portal's
/// oppCreateQuote handoff) — generating a quote stub reaches into the Sales/Quote
/// module, which this domain cannot do. ADR candidate, see CRM-BE-HOST #2.
/// </summary>
public static class OpportunityEndpoints
{
    private const string LoggerCategory = "SpaceOS.Modules.CRM.Api.OpportunityEndpoints";
    private const string RouteBase = "/api/crm/opportunities";

    public static IEndpointRouteBuilder MapOpportunityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup(RouteBase)
            .WithTags("CRM - Opportunities")
            .RequireAuthorization();

        group.MapGet("", ListOpportunities)
            .WithName("ListOpportunities")
            .WithSummary("List opportunities (filters: status, open; newest first)")
            .Produces<OpportunityDto[]>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest);

        group.MapGet("/{id:guid}", GetOpportunity)
            .WithName("GetOpportunity")
            .WithSummary("Get opportunity by id")
            .Produces<OpportunityDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        group.MapPut("/{id:guid}/start-discovery", StartDiscovery)
            .WithName("StartOpportunityDiscovery")
            .WithSummary("FSM: Open → NeedsAssessment (nyitott → igenyfelmeres)")
            .Produces<OpportunityDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}/start-proposal", StartProposal)
            .WithName("StartOpportunityProposal")
            .WithSummary("FSM: NeedsAssessment → SolutionAssembly (igenyfelmeres → osszeallitas)")
            .Produces<OpportunityDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}/send-quote", SendQuote)
            .WithName("SendOpportunityQuote")
            .WithSummary("FSM: SolutionAssembly → Proposal (osszeallitas → ajanlat)")
            .Produces<OpportunityDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}/negotiate", Negotiate)
            .WithName("NegotiateOpportunity")
            .WithSummary("FSM: Proposal → Negotiation (ajanlat → targyalas)")
            .Produces<OpportunityDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}/win", Win)
            .WithName("WinOpportunity")
            .WithSummary("FSM: Negotiation → Won (targyalas → megnyert)")
            .Produces<OpportunityDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}/lose", Lose)
            .WithName("LoseOpportunity")
            .WithSummary("FSM: any open stage → Lost (elveszett); reason is mandatory")
            .Produces<OpportunityDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPost("/{id:guid}/activities", LogActivity)
            .WithName("LogOpportunityActivity")
            .WithSummary("Append an activity log entry; returns the fresh opportunity")
            .Produces<OpportunityDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound);

        return app;
    }

    // ══════════ Handlers ══════════

    private static async Task<Microsoft.AspNetCore.Http.IResult> ListOpportunities(
        [FromServices] IMediator mediator,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        [FromQuery(Name = "status")] string? status,
        [FromQuery(Name = "open")] bool? open,
        CancellationToken ct)
    {
        OpportunityStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!CrmWire.OpportunityStatus.TryParse(status, out var parsed))
            {
                return CrmEndpointResults.BadRequest(
                    $"Invalid status filter '{status}'. Lehetséges értékek: " +
                    $"{string.Join(", ", CrmWire.OpportunityStatus.Spellings)}.");
            }
            statusFilter = parsed;
        }

        var query = new GetOpportunitiesQuery
        {
            TenantId = tenantId,
            StatusFilter = statusFilter?.ToString()
        };

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return CrmEndpointResults.Failure(result);
        }

        var rows = result.Value.Data.AsEnumerable();

        // open=true → only the non-terminal stages (portal OPP_OPEN_STAGES mirror,
        // guarded by the domain transition table — not a duplicated literal list).
        if (open == true)
        {
            rows = rows.Where(IsOpenStage);
        }

        return Results.Ok(rows.ToArray());
    }

    /// <summary>True if the DTO's stage is a non-terminal one.</summary>
    private static bool IsOpenStage(OpportunityDto dto)
        => CrmWire.OpportunityStatus.TryParse(dto.Status, out var parsed)
           && OpportunityStatusTransitions.IsOpen(parsed);

    private static async Task<Microsoft.AspNetCore.Http.IResult> GetOpportunity(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
    {
        var result = await mediator
            .Send(new GetOpportunityByIdQuery { TenantId = tenantId, OpportunityId = id }, ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : CrmEndpointResults.Failure(result);
    }

    private static Task<Microsoft.AspNetCore.Http.IResult> StartDiscovery(
        [FromRoute] Guid id,
        [FromBody] OpportunityNoteRequestDto? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
        => ExecuteTransition(
            mediator, loggerFactory,
            new StartNeedsAssessmentCommand
            {
                TenantId = tenantId,
                OpportunityId = id,
                ActedBy = request?.ActedBy ?? Guid.Empty
            },
            id, tenantId, "start-discovery", ct);

    private static Task<Microsoft.AspNetCore.Http.IResult> StartProposal(
        [FromRoute] Guid id,
        [FromBody] OpportunityNoteRequestDto? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
        => ExecuteTransition(
            mediator, loggerFactory,
            new StartSolutionAssemblyCommand
            {
                TenantId = tenantId,
                OpportunityId = id,
                ActedBy = request?.ActedBy ?? Guid.Empty
            },
            id, tenantId, "start-proposal", ct);

    private static Task<Microsoft.AspNetCore.Http.IResult> SendQuote(
        [FromRoute] Guid id,
        [FromBody] SendQuoteRequestDto? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
        // QuoteId is optional on the wire: the portal sends only a note, because
        // the quote itself lives in the Sales module (CRM-BE-HOST follow-up #2).
        => ExecuteTransition(
            mediator, loggerFactory,
            new SendProposalCommand
            {
                TenantId = tenantId,
                OpportunityId = id,
                QuoteId = request?.QuoteId ?? Guid.Empty,
                SentBy = request?.ActedBy ?? Guid.Empty
            },
            id, tenantId, "send-quote", ct);

    private static Task<Microsoft.AspNetCore.Http.IResult> Negotiate(
        [FromRoute] Guid id,
        [FromBody] OpportunityNoteRequestDto? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
        => ExecuteTransition(
            mediator, loggerFactory,
            new StartNegotiationCommand
            {
                TenantId = tenantId,
                OpportunityId = id,
                ActedBy = request?.ActedBy ?? Guid.Empty
            },
            id, tenantId, "negotiate", ct);

    private static Task<Microsoft.AspNetCore.Http.IResult> Win(
        [FromRoute] Guid id,
        [FromBody] WinOpportunityRequestDto? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
        // OrderId is optional on the wire for the same reason as QuoteId above:
        // the order is created by the Sales/Order module.
        => ExecuteTransition(
            mediator, loggerFactory,
            new WinOpportunityCommand
            {
                TenantId = tenantId,
                OpportunityId = id,
                OrderId = request?.OrderId ?? Guid.Empty,
                FinalValue = request?.FinalValue,
                WonBy = request?.ActedBy ?? Guid.Empty
            },
            id, tenantId, "win", ct);

    private static async Task<Microsoft.AspNetCore.Http.IResult> Lose(
        [FromRoute] Guid id,
        [FromBody] LoseOpportunityRequestDto? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
    {
        // Payload guard before the FSM guard — the portal MSW returns 400 here.
        if (string.IsNullOrWhiteSpace(request?.Reason))
        {
            return CrmEndpointResults.BadRequest("Az elvesztés indoka kötelező.");
        }

        return await ExecuteTransition(
                mediator, loggerFactory,
                new LoseOpportunityCommand
                {
                    TenantId = tenantId,
                    OpportunityId = id,
                    Reason = request.Reason,
                    CompetitorName = request.CompetitorName,
                    LostBy = request.ActedBy
                },
                id, tenantId, "lose", ct)
            .ConfigureAwait(false);
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

        var command = new LogOpportunityActivityCommand
        {
            TenantId = tenantId,
            OpportunityId = id,
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
    /// Shared transition execution — mirrors LeadEndpoints: fresh DTO on success
    /// (200), module error contract on failure (404 / 409 / 400).
    /// </summary>
    private static async Task<Microsoft.AspNetCore.Http.IResult> ExecuteTransition(
        IMediator mediator,
        ILoggerFactory loggerFactory,
        IRequest<Ardalis.Result.Result<OpportunityDto>> command,
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
                "CRM opportunity {OpportunityId} {Action} rejected ({Status}) for tenant {TenantId}",
                id, action, result.Status, tenantId);

            return CrmEndpointResults.Failure(result);
        }

        logger.LogInformation(
            "CRM opportunity {OpportunityId} {Action} succeeded for tenant {TenantId}",
            id, action, tenantId);

        return Results.Ok(result.Value);
    }
}

// ══════════ Request DTOs ══════════

/// <summary>Optional note carried by the simple opportunity transitions.</summary>
public record OpportunityNoteRequestDto(string? Note, Guid ActedBy);

/// <summary>Send-quote payload; QuoteId is optional (Sales module handoff).</summary>
public record SendQuoteRequestDto(string? Note, Guid? QuoteId, Guid ActedBy);

/// <summary>Win payload; OrderId / FinalValue are optional (Sales module handoff).</summary>
public record WinOpportunityRequestDto(string? Note, Guid? OrderId, decimal? FinalValue, Guid ActedBy);

/// <summary>Lose payload — the reason is mandatory (400 without it).</summary>
public record LoseOpportunityRequestDto(string Reason, string? CompetitorName, Guid ActedBy);
