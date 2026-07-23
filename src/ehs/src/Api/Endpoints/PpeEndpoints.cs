using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Ppe.Commands.AcknowledgePpeIssuance;
using SpaceOS.Modules.Ehs.Application.Ppe.Commands.CreatePpeItem;
using SpaceOS.Modules.Ehs.Application.Ppe.Commands.DeactivatePpeItem;
using SpaceOS.Modules.Ehs.Application.Ppe.Commands.IssuePpe;
using SpaceOS.Modules.Ehs.Application.Ppe.Commands.ReplacePpeIssuance;
using SpaceOS.Modules.Ehs.Application.Ppe.Commands.ReturnPpeIssuance;
using SpaceOS.Modules.Ehs.Application.Ppe.Commands.UpdatePpeItem;
using SpaceOS.Modules.Ehs.Application.Ppe.Queries.GetPpeIssuanceById;
using SpaceOS.Modules.Ehs.Application.Ppe.Queries.GetPpeItemById;
using SpaceOS.Modules.Ehs.Application.Ppe.Queries.ListPpeIssuances;
using SpaceOS.Modules.Ehs.Application.Ppe.Queries.ListPpeItems;
using SpaceOS.Modules.Ehs.Application.Wire;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Api.Endpoints;

/// <summary>
/// PPE (EVE) endpoints — catalogue CRUD + issuance FSM
/// (kiadva → atvett → visszavett | cserelve).
/// Error contract: 404 = not found, 409 = illegal FSM transition, 400 = invalid input.
/// </summary>
public static class PpeEndpoints
{
    public static void MapPpeEndpoints(this IEndpointRouteBuilder app)
    {
        MapPpeItemEndpoints(app);
        MapPpeIssuanceEndpoints(app);
    }

    // ── PPE catalogue ────────────────────────────────────────────────────

    private static void MapPpeItemEndpoints(IEndpointRouteBuilder app)
    {
        var items = app.MapGroup("/api/ehs/ppe-items")
            .WithTags("PpeItems")
            .WithOpenApi()
            .RequireAuthorization();

        items.MapPost("/", CreateItem)
            .WithName("CreatePpeItem")
            .WithSummary("Create a PPE catalogue item")
            .Produces<Guid>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        items.MapGet("/", ListItems)
            .WithName("ListPpeItems")
            .WithSummary("List PPE catalogue items (filter: activeOnly, category)")
            .Produces(StatusCodes.Status200OK);

        items.MapGet("/{id:guid}", GetItem)
            .WithName("GetPpeItem")
            .WithSummary("Get PPE catalogue item by ID")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        items.MapPut("/{id:guid}", UpdateItem)
            .WithName("UpdatePpeItem")
            .WithSummary("Update a PPE catalogue item")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        items.MapPost("/{id:guid}/deactivate", DeactivateItem)
            .WithName("DeactivatePpeItem")
            .WithSummary("Soft-deactivate a PPE catalogue item")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);
    }

    // ── PPE issuances (FSM) ──────────────────────────────────────────────

    private static void MapPpeIssuanceEndpoints(IEndpointRouteBuilder app)
    {
        var issuances = app.MapGroup("/api/ehs/ppe-issuances")
            .WithTags("PpeIssuances")
            .WithOpenApi()
            .RequireAuthorization();

        issuances.MapPost("/", IssuePpe)
            .WithName("IssuePpe")
            .WithSummary("Record a PPE hand-out (FSM entry: Issued / kiadva)")
            .Produces<Guid>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        issuances.MapGet("/", ListIssuances)
            .WithName("ListPpeIssuances")
            .WithSummary("List PPE issuances (filter: employeeId, status, expiringWithinDays)")
            .Produces(StatusCodes.Status200OK);

        issuances.MapGet("/expiring", ListExpiringIssuances)
            .WithName("ListExpiringPpeIssuances")
            .WithSummary("List outstanding issuances expiring within the window (dashboard)")
            .Produces(StatusCodes.Status200OK);

        issuances.MapGet("/by-employee/{employeeId:guid}", ListIssuancesByEmployee)
            .WithName("GetEmployeePpeSheet")
            .WithSummary("Employee PPE sheet — every issuance of one employee (portal view)")
            .Produces(StatusCodes.Status200OK);

        issuances.MapGet("/{id:guid}", GetIssuance)
            .WithName("GetPpeIssuance")
            .WithSummary("Get PPE issuance by ID")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        issuances.MapPost("/{id:guid}/acknowledge", AcknowledgeIssuance)
            .WithName("AcknowledgePpeIssuance")
            .WithSummary("FSM: Issued → Acknowledged (atvett) — employee acknowledges receipt")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        issuances.MapPost("/{id:guid}/return", ReturnIssuance)
            .WithName("ReturnPpeIssuance")
            .WithSummary("FSM: Acknowledged → Returned (visszavett)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        issuances.MapPost("/{id:guid}/replace", ReplaceIssuance)
            .WithName("ReplacePpeIssuance")
            .WithSummary("FSM: Acknowledged → Replaced (cserelve) — spawns a new issuance")
            .Produces<Guid>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);
    }

    // ── Handlers: catalogue ──────────────────────────────────────────────

    private static async Task<IResult> CreateItem(
        [FromBody] CreatePpeItemRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new CreatePpeItemCommand(
                tenantContext.TenantId,
                request.Name,
                request.Category,
                request.StandardRef,
                request.DefaultLifetimeMonths);

            var itemId = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/ppe-items/{itemId}", new { PpeItemId = itemId });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> ListItems(
        [AsParameters] ListPpeItemsRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        // Query-string enums bypass the JSON converters — parse the Hungarian
        // wire keys by hand (ADR-059); unknown key → 400, not an empty list.
        if (!WireQuery.TryParse(EhsWire.PpeCategory, request.Category, "EVE-kategória", out var category, out var categoryError))
            return categoryError!;

        var filter = new PpeItemFilter(request.ActiveOnly, category);
        var query = new ListPpeItemsQuery(tenantContext.TenantId, filter);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetItem(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var query = new GetPpeItemByIdQuery(id, tenantContext.TenantId);
            var result = await mediator.Send(query, ct).ConfigureAwait(false);
            return Results.Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> UpdateItem(
        Guid id,
        [FromBody] UpdatePpeItemRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new UpdatePpeItemCommand(
                id,
                tenantContext.TenantId,
                request.Name,
                request.Category,
                request.StandardRef,
                request.DefaultLifetimeMonths);

            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> DeactivateItem(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new DeactivatePpeItemCommand(id, tenantContext.TenantId);
            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (ValidationException)
        {
            // Pipeline guard (id/tenant NotEmpty): an empty id can never match a
            // resource — 404 per the documented 204/404/409 contract (no 400 here).
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
    }

    // ── Handlers: issuances ──────────────────────────────────────────────

    private static async Task<IResult> IssuePpe(
        [FromBody] IssuePpeRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new IssuePpeCommand(
                tenantContext.TenantId,
                request.EmployeeId,
                request.PpeItemId,
                request.IssuedBy,
                request.Quantity,
                request.ExpiresAt);

            var issuanceId = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/ppe-issuances/{issuanceId}", new { IssuanceId = issuanceId });
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> ListIssuances(
        [AsParameters] ListPpeIssuancesRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        // Query-string enums bypass the JSON converters — parse the Hungarian
        // wire keys by hand (ADR-059); unknown key → 400, not an empty list.
        if (!WireQuery.TryParse(EhsWire.PpeIssuanceStatus, request.Status, "kiadás-státusz", out var status, out var statusError))
            return statusError!;

        var filter = new PpeIssuanceFilter(request.EmployeeId, status, request.ExpiringWithinDays);
        var query = new ListPpeIssuancesQuery(tenantContext.TenantId, filter);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> ListExpiringIssuances(
        [FromQuery] int? withinDays,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        var filter = new PpeIssuanceFilter(ExpiringWithinDays: withinDays ?? 30);
        var query = new ListPpeIssuancesQuery(tenantContext.TenantId, filter);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> ListIssuancesByEmployee(
        Guid employeeId,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        var filter = new PpeIssuanceFilter(EmployeeId: employeeId);
        var query = new ListPpeIssuancesQuery(tenantContext.TenantId, filter);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetIssuance(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var query = new GetPpeIssuanceByIdQuery(id, tenantContext.TenantId);
            var result = await mediator.Send(query, ct).ConfigureAwait(false);
            return Results.Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> AcknowledgeIssuance(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new AcknowledgePpeIssuanceCommand(id, tenantContext.TenantId);
            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (ValidationException)
        {
            // Pipeline guard (empty id/tenant) → 404, same contract as DeactivateItem.
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> ReturnIssuance(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new ReturnPpeIssuanceCommand(id, tenantContext.TenantId);
            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (ValidationException)
        {
            // Pipeline guard (empty id/tenant) → 404, same contract as DeactivateItem.
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> ReplaceIssuance(
        Guid id,
        [FromBody] ReplacePpeIssuanceRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new ReplacePpeIssuanceCommand(
                id,
                tenantContext.TenantId,
                request.ReplacedBy,
                request.NewExpiresAt);

            var newIssuanceId = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/ppe-issuances/{newIssuanceId}", new { IssuanceId = newIssuanceId });
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }
}

// Request DTOs
public record CreatePpeItemRequest(
    string Name,
    Domain.Enums.PpeCategory Category,
    string? StandardRef,
    int? DefaultLifetimeMonths
);

public record UpdatePpeItemRequest(
    string Name,
    Domain.Enums.PpeCategory Category,
    string? StandardRef,
    int? DefaultLifetimeMonths
);

/// <summary>
/// List filter — the category filter travels as a raw string and is parsed
/// against the EhsWire map in the handler (ADR-059 Hungarian wire keys).
/// </summary>
public record ListPpeItemsRequest(
    bool? ActiveOnly = null,
    string? Category = null
);

public record IssuePpeRequest(
    Guid EmployeeId,
    Guid PpeItemId,
    Guid IssuedBy,
    int Quantity,
    DateTimeOffset? ExpiresAt
);

/// <summary>
/// List filter — the status filter travels as a raw string and is parsed
/// against the EhsWire map in the handler (ADR-059 Hungarian wire keys).
/// </summary>
public record ListPpeIssuancesRequest(
    Guid? EmployeeId = null,
    string? Status = null,
    int? ExpiringWithinDays = null
);

public record ReplacePpeIssuanceRequest(
    Guid ReplacedBy,
    DateTimeOffset? NewExpiresAt
);
