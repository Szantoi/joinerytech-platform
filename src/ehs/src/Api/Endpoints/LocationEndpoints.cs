using MediatR;
using Microsoft.AspNetCore.Mvc;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Locations.Commands.CreateLocation;
using SpaceOS.Modules.Ehs.Application.Locations.Commands.DeactivateLocation;
using SpaceOS.Modules.Ehs.Application.Locations.Commands.UpdateLocation;
using SpaceOS.Modules.Ehs.Application.Locations.Queries.GetLocationById;
using SpaceOS.Modules.Ehs.Application.Locations.Queries.ListLocations;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Api.Endpoints;

/// <summary>
/// EHS location endpoints — hierarchical location registry.
/// Error contract: 404 = not found, 409 = domain guard violation, 400 = invalid input.
/// </summary>
public static class LocationEndpoints
{
    public static void MapLocationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ehs/locations")
            .WithTags("Locations")
            .WithOpenApi()
            .RequireAuthorization();

        // GET /api/ehs/locations
        group.MapGet("/", ListLocations)
            .WithName("ListLocations")
            .WithSummary("List locations (flat list; build the tree from parentLocationId)")
            .Produces(StatusCodes.Status200OK);

        // GET /api/ehs/locations/{id}
        group.MapGet("/{id:guid}", GetLocation)
            .WithName("GetLocation")
            .WithSummary("Get location by ID")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        // POST /api/ehs/locations
        group.MapPost("/", CreateLocation)
            .WithName("CreateLocation")
            .WithSummary("Create a new location node")
            .Produces<Guid>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // PUT /api/ehs/locations/{id}
        group.MapPut("/{id:guid}", UpdateLocation)
            .WithName("UpdateLocation")
            .WithSummary("Rename / re-classify / move a location")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/locations/{id}/deactivate
        group.MapPost("/{id:guid}/deactivate", DeactivateLocation)
            .WithName("DeactivateLocation")
            .WithSummary("Soft-deactivate a location (guard: no active children)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);
    }

    private static async Task<IResult> ListLocations(
        [AsParameters] ListLocationsRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        var filter = new LocationFilter(request.ActiveOnly, request.Kind, request.ParentLocationId);
        var query = new ListLocationsQuery(tenantContext.TenantId, filter);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetLocation(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var query = new GetLocationByIdQuery(id, tenantContext.TenantId);
            var result = await mediator.Send(query, ct).ConfigureAwait(false);
            return Results.Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CreateLocation(
        [FromBody] CreateLocationRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new CreateLocationCommand(
                tenantContext.TenantId,
                request.Code,
                request.Name,
                request.Kind,
                request.ParentLocationId);

            var locationId = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/locations/{locationId}", new { LocationId = locationId });
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

    private static async Task<IResult> UpdateLocation(
        Guid id,
        [FromBody] UpdateLocationRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new UpdateLocationCommand(
                id,
                tenantContext.TenantId,
                request.Code,
                request.Name,
                request.Kind,
                request.ParentLocationId);

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

    private static async Task<IResult> DeactivateLocation(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new DeactivateLocationCommand(id, tenantContext.TenantId);
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
    }
}

// Request DTOs
public record ListLocationsRequest(
    bool? ActiveOnly = null,
    Domain.Enums.LocationKind? Kind = null,
    Guid? ParentLocationId = null
);

public record CreateLocationRequest(
    string Code,
    string Name,
    Domain.Enums.LocationKind Kind,
    Guid? ParentLocationId
);

public record UpdateLocationRequest(
    string Code,
    string Name,
    Domain.Enums.LocationKind Kind,
    Guid? ParentLocationId
);
