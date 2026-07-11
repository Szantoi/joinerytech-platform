using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Modules.CRM.Application.Commands.AbandonOpportunity;
using SpaceOS.Modules.CRM.Application.Commands.AddOpportunityActivity;
using SpaceOS.Modules.CRM.Application.Commands.CreateOpportunity;
using SpaceOS.Modules.CRM.Application.Commands.LoseOpportunity;
using SpaceOS.Modules.CRM.Application.Commands.NegotiateOpportunity;
using SpaceOS.Modules.CRM.Application.Commands.ProposeOpportunity;
using SpaceOS.Modules.CRM.Application.Commands.WinOpportunity;
using SpaceOS.Modules.CRM.Application.Queries.GetOpportunityById;
using SpaceOS.Modules.CRM.Application.Queries.GetOpportunitiesByStatus;
using SpaceOS.Modules.CRM.Application.Queries.GetOpportunityForecast;

namespace SpaceOS.Modules.CRM.Api;

/// <summary>
/// Opportunity CRM endpoints (10 total)
/// </summary>
public static class OpportunityEndpoints
{
    public static IEndpointRouteBuilder MapOpportunityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/crm/opportunities")
            .WithTags("CRM - Opportunities")
            .RequireAuthorization();

        // POST /api/crm/opportunities - CreateOpportunity
        group.MapPost("/", CreateOpportunity)
            .WithName("CreateOpportunity")
            .WithSummary("Create a new opportunity")
            .Produces<Guid>(201)
            .ProducesValidationProblem()
            .ProducesProblem(400);

        // PUT /api/crm/opportunities/{id}/propose - ProposeOpportunity
        group.MapPut("/{id:guid}/propose", ProposeOpportunity)
            .WithName("ProposeOpportunity")
            .WithSummary("Propose opportunity (FSM: Draft → Proposal, 30% probability)")
            .Produces(204)
            .ProducesValidationProblem()
            .ProducesProblem(404)
            .ProducesProblem(400);

        // PUT /api/crm/opportunities/{id}/negotiate - NegotiateOpportunity
        group.MapPut("/{id:guid}/negotiate", NegotiateOpportunity)
            .WithName("NegotiateOpportunity")
            .WithSummary("Negotiate opportunity (FSM: Proposal → Negotiation, 60% probability)")
            .Produces(204)
            .ProducesValidationProblem()
            .ProducesProblem(404)
            .ProducesProblem(400);

        // PUT /api/crm/opportunities/{id}/win - WinOpportunity
        group.MapPut("/{id:guid}/win", WinOpportunity)
            .WithName("WinOpportunity")
            .WithSummary("Win opportunity (FSM: Negotiation → Won, 100% probability)")
            .Produces(204)
            .ProducesValidationProblem()
            .ProducesProblem(404)
            .ProducesProblem(400);

        // PUT /api/crm/opportunities/{id}/lose - LoseOpportunity
        group.MapPut("/{id:guid}/lose", LoseOpportunity)
            .WithName("LoseOpportunity")
            .WithSummary("Lose opportunity (FSM: Negotiation → Lost, 0% probability)")
            .Produces(204)
            .ProducesValidationProblem()
            .ProducesProblem(404)
            .ProducesProblem(400);

        // PUT /api/crm/opportunities/{id}/abandon - AbandonOpportunity
        group.MapPut("/{id:guid}/abandon", AbandonOpportunity)
            .WithName("AbandonOpportunity")
            .WithSummary("Abandon opportunity (FSM: Draft/Proposal → Abandoned, 0% probability)")
            .Produces(204)
            .ProducesValidationProblem()
            .ProducesProblem(404)
            .ProducesProblem(400);

        // POST /api/crm/opportunities/{id}/activities - AddOpportunityActivity
        group.MapPost("/{id:guid}/activities", AddOpportunityActivity)
            .WithName("AddOpportunityActivity")
            .WithSummary("Add activity to opportunity")
            .Produces(204)
            .ProducesValidationProblem()
            .ProducesProblem(404);

        // GET /api/crm/opportunities/{id} - GetOpportunityById
        group.MapGet("/{id:guid}", GetOpportunityById)
            .WithName("GetOpportunityById")
            .WithSummary("Get opportunity by ID")
            .Produces<Application.DTOs.OpportunityResponse>()
            .ProducesProblem(404)
            .ProducesProblem(403);

        // GET /api/crm/opportunities?status={status} - GetOpportunitiesByStatus
        group.MapGet("/", GetOpportunitiesByStatus)
            .WithName("GetOpportunitiesByStatus")
            .WithSummary("Get opportunities by status (optional filter)")
            .Produces<List<Application.DTOs.OpportunityResponse>>()
            .ProducesProblem(403);

        // GET /api/crm/forecast?currency={currency} - GetOpportunityForecast
        group.MapGet("/forecast", GetOpportunityForecast)
            .WithName("GetOpportunityForecast")
            .WithSummary("Get opportunity forecast (weighted by probability)")
            .Produces<Application.DTOs.OpportunityForecastResponse>()
            .ProducesValidationProblem()
            .ProducesProblem(403);

        // POST /api/crm/opportunities/{id}/convert-to-quote - ConvertToQuote (ADR-063)
        group.MapPost("/{id:guid}/convert-to-quote", ConvertToQuote)
            .WithName("ConvertOpportunityToQuote")
            .WithSummary("Convert opportunity to quote (FSM: Negotiation → Converting) (ADR-063)")
            .Produces<ConversionResponse>(202)
            .ProducesValidationProblem()
            .ProducesProblem(404)
            .ProducesProblem(409);

        // GET /api/crm/conversions/{conversionId} - GetConversionStatus (ADR-063)
        group.MapGet("/conversions/{conversionId:guid}", GetConversionStatus)
            .WithName("GetConversionStatus")
            .WithSummary("Get conversion status (polling endpoint) (ADR-063)")
            .Produces<ConversionStatusResponse>()
            .ProducesProblem(404);

        return app;
    }

    private static async Task<IResult> CreateOpportunity(
        [FromBody] CreateOpportunityRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new CreateOpportunityCommand
        {
            Name = request.Name,
            Email = request.Email,
            Phone = request.Phone,
            Company = request.Company,
            EstimatedValue = request.EstimatedValue,
            Currency = request.Currency,
            AssignedTo = request.AssignedTo,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.Created($"/api/crm/opportunities/{result.Value}", result.Value)
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> ProposeOpportunity(
        [FromRoute] Guid id,
        [FromBody] ProposeOpportunityRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new ProposeOpportunityCommand
        {
            OpportunityId = id,
            ExpectedCloseDate = request.ExpectedCloseDate,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> NegotiateOpportunity(
        [FromRoute] Guid id,
        [FromBody] NegotiateOpportunityRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new NegotiateOpportunityCommand
        {
            OpportunityId = id,
            UpdatedValue = request.UpdatedValue,
            UpdatedCurrency = request.UpdatedCurrency,
            UpdatedProbability = request.UpdatedProbability,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> WinOpportunity(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new WinOpportunityCommand
        {
            OpportunityId = id,
            WonBy = userId,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> LoseOpportunity(
        [FromRoute] Guid id,
        [FromBody] LoseOpportunityRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new LoseOpportunityCommand
        {
            OpportunityId = id,
            Reason = request.Reason,
            LostBy = userId,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> AbandonOpportunity(
        [FromRoute] Guid id,
        [FromBody] AbandonOpportunityRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new AbandonOpportunityCommand
        {
            OpportunityId = id,
            Reason = request.Reason,
            AbandonedBy = userId,
            TenantId = tenantId
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> AddOpportunityActivity(
        [FromRoute] Guid id,
        [FromBody] AddOpportunityActivityRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new AddOpportunityActivityCommand
        {
            OpportunityId = id,
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

    private static async Task<IResult> GetOpportunityById(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetOpportunityByIdQuery
        {
            OpportunityId = id,
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

    private static async Task<IResult> GetOpportunitiesByStatus(
        [FromQuery] string? status,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetOpportunitiesByStatusQuery
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

    private static async Task<IResult> GetOpportunityForecast(
        [FromQuery] string currency,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetOpportunityForecastQuery
        {
            Currency = currency,
            TenantId = tenantId
        };

        var result = await mediator.Send(query, ct);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : result.Status == Ardalis.Result.ResultStatus.Forbidden
                ? Results.Forbid()
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> ConvertToQuote(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new SpaceOS.Modules.CRM.Application.Commands.ConvertOpportunityToQuote.ConvertOpportunityToQuoteCommand
        {
            OpportunityId = id
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.Accepted($"/api/crm/conversions/{result.Value.ConversionId}", new ConversionResponse(
                result.Value.ConversionId,
                "Converting",
                $"/api/crm/conversions/{result.Value.ConversionId}"
            ))
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : Results.Conflict(result.Errors);
    }

    private static async Task<IResult> GetConversionStatus(
        [FromRoute] Guid conversionId,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new SpaceOS.Modules.CRM.Application.Queries.GetOpportunityByConversionId.GetOpportunityByConversionIdQuery
        {
            ConversionId = conversionId,
            TenantId = tenantId
        };

        var result = await mediator.Send(query, ct);

        if (!result.IsSuccess)
        {
            return result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(result.Errors)
                : result.Status == Ardalis.Result.ResultStatus.Forbidden
                    ? Results.Forbid()
                    : Results.BadRequest(result.Errors);
        }

        var opportunity = result.Value;

        // Map to ConversionStatusResponse
        var status = opportunity.Status switch
        {
            "Won" => "completed",
            "Converting" => "pending",
            _ => "failed"
        };

        return Results.Ok(new ConversionStatusResponse(
            conversionId,
            status,
            opportunity.QuoteRef,
            opportunity.Id
        ));
    }
}

// Request DTOs
public record CreateOpportunityRequest(
    string Name,
    string Email,
    string? Phone,
    string? Company,
    decimal EstimatedValue,
    string Currency,
    Guid AssignedTo
);

public record ProposeOpportunityRequest(DateTime ExpectedCloseDate);

public record NegotiateOpportunityRequest(
    decimal? UpdatedValue,
    string? UpdatedCurrency,
    decimal? UpdatedProbability
);

public record LoseOpportunityRequest(string Reason);

public record AbandonOpportunityRequest(string Reason);

public record AddOpportunityActivityRequest(string Type, string Description);

// ADR-063 Response DTOs
public record ConversionResponse(
    Guid ConversionId,
    string Status,
    string PollUrl
);

public record ConversionStatusResponse(
    Guid ConversionId,
    string Status,
    Guid? QuoteId,
    Guid OpportunityId
);
