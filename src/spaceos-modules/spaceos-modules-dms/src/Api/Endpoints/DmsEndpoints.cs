using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Application.Queries;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Api.Endpoints;

/// <summary>
/// DMS API endpoints using Minimal API pattern.
/// </summary>
public static class DmsEndpoints
{
    /// <summary>
    /// Maps DMS endpoints to the application.
    /// </summary>
    public static IEndpointRouteBuilder MapDmsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dms")
            .WithTags("DMS")
            .RequireAuthorization();

        // Document Endpoints
        group.MapPost("/documents", CreateDocument)
            .WithName("CreateDocument")
            .WithSummary("Create a new document")
            .Produces<Guid>(201)
            .ProducesValidationProblem();

        group.MapGet("/documents/{id:guid}", GetDocument)
            .WithName("GetDocument")
            .WithSummary("Get document by ID")
            .Produces<DocumentDto>(200)
            .Produces(404);

        group.MapPost("/documents/{id:guid}/versions", UploadVersion)
            .WithName("UploadDocumentVersion")
            .WithSummary("Upload a new version of a document")
            .Produces<Guid>(201)
            .ProducesValidationProblem();

        group.MapGet("/documents/{id:guid}/history", GetDocumentHistory)
            .WithName("GetDocumentHistory")
            .WithSummary("Get version history of a document")
            .Produces<IReadOnlyList<DocumentVersionDto>>(200)
            .Produces(404);

        group.MapPut("/documents/{id:guid}/metadata", UpdateMetadata)
            .WithName("UpdateDocumentMetadata")
            .WithSummary("Update document metadata")
            .Produces(204)
            .Produces(404)
            .ProducesValidationProblem();

        group.MapDelete("/documents/{id:guid}", DeleteDocument)
            .WithName("DeleteDocument")
            .WithSummary("Soft-delete a document")
            .Produces(204)
            .Produces(404);

        // Folder Endpoints
        group.MapGet("/folders/tree", GetFolderTree)
            .WithName("GetFolderTree")
            .WithSummary("Get folder tree (hierarchical structure)")
            .Produces<IReadOnlyList<FolderTreeDto>>(200);

        return app;
    }

    // ============ HANDLERS ============

    private static async Task<IResult> CreateDocument(
        [FromBody] CreateDocumentDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        // Note: In production, file upload would be handled via multipart/form-data
        // For Week 2, this is a simplified version
        var command = new CreateDocumentCommand
        {
            TenantId = TenantId.From(tenantId),
            FolderId = FolderId.From(request.FolderId),
            FileName = request.Title, // Simplified
            Title = request.Title,
            Description = request.Description,
            Tags = request.Tags,
            ContentType = request.ContentType,
            FileSizeBytes = request.FileSizeBytes,
            UploadedByUserId = UserId.From(userId),
            FileStream = new MemoryStream() // TODO: Replace with actual file stream from multipart
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.Created($"/api/dms/documents/{result.Value.Value}", new { documentId = result.Value.Value })
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> GetDocument(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        CancellationToken ct)
    {
        var query = new GetDocumentQuery(DocumentId.From(id));
        var result = await mediator.Send(query, ct);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.NotFound();
    }

    private static async Task<IResult> UploadVersion(
        [FromRoute] Guid id,
        [FromBody] UploadVersionDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new UploadVersionCommand
        {
            DocumentId = DocumentId.From(id),
            UploadedByUserId = UserId.From(userId),
            ChangeNotes = request.Comment,
            FileStream = new MemoryStream() // TODO: Replace with actual file stream
        };

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.Created($"/api/dms/documents/{id}/versions/{request.VersionNumber}", new { versionId = result.Value })
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> GetDocumentHistory(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        CancellationToken ct)
    {
        var query = new GetDocumentHistoryQuery(DocumentId.From(id));
        var result = await mediator.Send(query, ct);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.NotFound();
    }

    private static async Task<IResult> UpdateMetadata(
        [FromRoute] Guid id,
        [FromBody] UpdateMetadataDto request,
        [FromServices] IMediator mediator,
        CancellationToken ct)
    {
        var command = new UpdateMetadataCommand(
            DocumentId.From(id),
            request.Title,
            request.Description,
            request.Tags
        );

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> DeleteDocument(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        CancellationToken ct)
    {
        var command = new DeleteDocumentCommand(DocumentId.From(id));
        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : Results.NotFound();
    }

    private static async Task<IResult> GetFolderTree(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetFolderTreeQuery(TenantId.From(tenantId));
        var result = await mediator.Send(query, ct);

        return Results.Ok(result.Value);
    }
}
