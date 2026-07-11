using MediatR;
using Microsoft.AspNetCore.Mvc;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.Commands.CreateTrainingRecord;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.Queries.GetExpiringTrainings;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.Queries.GetTrainingRecordById;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Api.Endpoints;

/// <summary>
/// Training Record endpoints registration.
/// </summary>
public static class TrainingRecordEndpoints
{
    public static void MapTrainingRecordEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ehs/training-records")
            .WithTags("Training Records")
            .WithOpenApi();

        group.MapPost("/", CreateTrainingRecord);
        group.MapGet("/{id:guid}", GetTrainingRecord);
        group.MapGet("/expiring", GetExpiringTrainings);
    }

    private static async Task<IResult> CreateTrainingRecord(
        [FromBody] CreateTrainingRecordRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new CreateTrainingRecordCommand(
                tenantContext.TenantId,
                request.EmployeeId,
                request.TrainingType,
                request.CompletedAt,
                request.IssuedBy,
                request.ExpiresAt,
                request.CertificateNumber
            );

            var id = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/training-records/{id}", new { TrainingRecordId = id });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> GetTrainingRecord(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var query = new GetTrainingRecordByIdQuery(id, tenantContext.TenantId);
            var result = await mediator.Send(query, ct).ConfigureAwait(false);
            return Results.Ok(result);
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> GetExpiringTrainings(
        [FromQuery] int? days,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        var query = new GetExpiringTrainingsQuery(tenantContext.TenantId, days ?? 30);
        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }
}

// Request DTOs
public record CreateTrainingRecordRequest(
    Guid EmployeeId,
    string TrainingType,
    DateTimeOffset CompletedAt,
    DateTimeOffset? ExpiresAt,
    string IssuedBy,
    string? CertificateNumber
);
