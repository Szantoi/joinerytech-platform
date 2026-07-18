using MediatR;
using Microsoft.AspNetCore.Mvc;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.ArchiveHazardousMaterial;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.RegisterHazardousMaterial;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.RenewSds;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.UpdateHazardousMaterial;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.GetExpiringSds;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.GetHazardousMaterialById;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.ListHazardousMaterials;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Api.Endpoints;

/// <summary>
/// Hazardous material endpoints — SDS registry with computed validity.
/// Error contract: 404 = not found, 409 = domain guard violation, 400 = invalid input.
/// </summary>
public static class HazardousMaterialEndpoints
{
    public static void MapHazardousMaterialEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ehs/hazardous-materials")
            .WithTags("HazardousMaterials")
            .WithOpenApi()
            .RequireAuthorization();

        // POST /api/ehs/hazardous-materials
        group.MapPost("/", RegisterMaterial)
            .WithName("RegisterHazardousMaterial")
            .WithSummary("Register a hazardous material with SDS metadata")
            .Produces<Guid>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // GET /api/ehs/hazardous-materials
        group.MapGet("/", ListMaterials)
            .WithName("ListHazardousMaterials")
            .WithSummary("List hazardous materials (filter: status, locationId, validity)")
            .Produces(StatusCodes.Status200OK);

        // GET /api/ehs/hazardous-materials/expiring
        group.MapGet("/expiring", GetExpiringSds)
            .WithName("GetExpiringSds")
            .WithSummary("List active materials with SDS expiring within the window (dashboard)")
            .Produces(StatusCodes.Status200OK);

        // GET /api/ehs/hazardous-materials/{id}
        group.MapGet("/{id:guid}", GetMaterial)
            .WithName("GetHazardousMaterial")
            .WithSummary("Get hazardous material by ID (with computed SDS validity)")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        // PUT /api/ehs/hazardous-materials/{id}
        group.MapPut("/{id:guid}", UpdateMaterial)
            .WithName("UpdateHazardousMaterial")
            .WithSummary("Update master data of a hazardous material")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/hazardous-materials/{id}/renew-sds
        group.MapPost("/{id:guid}/renew-sds", RenewSds)
            .WithName("RenewSds")
            .WithSummary("Register a new SDS version (new issue/expiry dates + optional document)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/hazardous-materials/{id}/archive
        group.MapPost("/{id:guid}/archive", ArchiveMaterial)
            .WithName("ArchiveHazardousMaterial")
            .WithSummary("Archive (phase out) a hazardous material")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);
    }

    private static async Task<IResult> RegisterMaterial(
        [FromBody] RegisterHazardousMaterialRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new RegisterHazardousMaterialCommand(
                tenantContext.TenantId,
                request.Name,
                request.Supplier,
                request.StorageLocationId,
                request.QuantityOnSite,
                request.Unit,
                request.SdsIssuedAt,
                request.SdsExpiresAt,
                request.CasNumber,
                request.GhsHazardClasses,
                request.SdsDocumentId);

            var materialId = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/hazardous-materials/{materialId}", new { MaterialId = materialId });
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

    private static async Task<IResult> ListMaterials(
        [AsParameters] ListHazardousMaterialsRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        var filter = new MaterialFilter(request.Status, request.LocationId, request.Validity);
        var query = new ListHazardousMaterialsQuery(tenantContext.TenantId, filter);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetExpiringSds(
        [FromQuery] int? withinDays,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        var query = new GetExpiringSdsQuery(tenantContext.TenantId, withinDays ?? 30);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetMaterial(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var query = new GetHazardousMaterialByIdQuery(id, tenantContext.TenantId);
            var result = await mediator.Send(query, ct).ConfigureAwait(false);
            return Results.Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> UpdateMaterial(
        Guid id,
        [FromBody] UpdateHazardousMaterialRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new UpdateHazardousMaterialCommand(
                id,
                tenantContext.TenantId,
                request.Name,
                request.Supplier,
                request.StorageLocationId,
                request.QuantityOnSite,
                request.Unit,
                request.CasNumber,
                request.GhsHazardClasses);

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

    private static async Task<IResult> RenewSds(
        Guid id,
        [FromBody] RenewSdsRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new RenewSdsCommand(
                id,
                tenantContext.TenantId,
                request.NewIssuedAt,
                request.NewExpiresAt,
                request.NewSdsDocumentId);

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

    private static async Task<IResult> ArchiveMaterial(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new ArchiveHazardousMaterialCommand(id, tenantContext.TenantId);
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
public record RegisterHazardousMaterialRequest(
    string Name,
    string Supplier,
    Guid StorageLocationId,
    decimal QuantityOnSite,
    string Unit,
    DateTimeOffset SdsIssuedAt,
    DateTimeOffset SdsExpiresAt,
    string? CasNumber,
    List<string>? GhsHazardClasses,
    Guid? SdsDocumentId
);

public record ListHazardousMaterialsRequest(
    Domain.Enums.MaterialStatus? Status = null,
    Guid? LocationId = null,
    Domain.Enums.SdsValidity? Validity = null
);

public record UpdateHazardousMaterialRequest(
    string Name,
    string Supplier,
    Guid StorageLocationId,
    decimal QuantityOnSite,
    string Unit,
    string? CasNumber,
    List<string>? GhsHazardClasses
);

public record RenewSdsRequest(
    DateTimeOffset NewIssuedAt,
    DateTimeOffset NewExpiresAt,
    Guid? NewSdsDocumentId
);
