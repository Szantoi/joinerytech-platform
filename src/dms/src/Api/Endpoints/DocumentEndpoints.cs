using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Application.Contracts;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Application.Queries;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Exceptions;

namespace SpaceOS.Modules.DMS.Api.Endpoints;

/// <summary>
/// Document API endpoints, Minimal API pattern — the portal MSW contract mirror
/// (src/joinerytech-portal/src/modules/dms/mocks/handlers.documents.ts):
/// list with filters + detail + FSM transitions
/// (submit/approve/reject/recall/archive/reopen) + version upload; every
/// mutation returns the FRESH DocumentDto with the computed
/// releasedVersion/expiry fields. POST /documents (create) is a backend extra
/// (the mock is seeded).
///
/// Error contract (MSW jsonError mirror — {error, message} body):
/// 404 unknown id · 409 illegal FSM transition / archived version upload ·
/// 400 payload guard (missing reject reason / version fields, invalid enum).
/// </summary>
public static class DocumentEndpoints
{
    private const string LoggerCategory = "SpaceOS.Modules.DMS.Api.DocumentEndpoints";

    /// <summary>Maps Document endpoints to the application.</summary>
    public static IEndpointRouteBuilder MapDocumentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dms/documents")
            .WithTags("DMS - Documents")
            .RequireAuthorization();

        group.MapGet("", ListDocuments)
            .WithName("ListDocuments")
            .WithSummary("List documents (filters: status, type, linkType, q, expiring; newest first / expiring: earliest validity first)")
            .Produces<DocumentDto[]>(200)
            .Produces(400);

        group.MapGet("/{id:guid}", GetDocument)
            .WithName("GetDocument")
            .WithSummary("Get document by ID (full version chain + computed releasedVersion/expiry)")
            .Produces<DocumentDto>(200)
            .Produces(404);

        group.MapPost("", CreateDocument)
            .WithName("CreateDocument")
            .WithSummary("Create a document (FSM entry: Draft, v1 working copy; metadata-only until the blob flow lands)")
            .Produces<DocumentDto>(201)
            .Produces(400);

        group.MapPost("/{id:guid}/submit", SubmitDocument)
            .WithName("SubmitDocument")
            .WithSummary("FSM: Draft → UnderReview (send for review)")
            .Produces<DocumentDto>(200)
            .Produces(404)
            .Produces(409);

        group.MapPost("/{id:guid}/approve", ApproveDocument)
            .WithName("ApproveDocument")
            .WithSummary("FSM: UnderReview → Released (optional note → reviewNote)")
            .Produces<DocumentDto>(200)
            .Produces(404)
            .Produces(409);

        group.MapPost("/{id:guid}/reject", RejectDocument)
            .WithName("RejectDocument")
            .WithSummary("FSM: UnderReview → Draft (MANDATORY reason → reviewNote)")
            .Produces<DocumentDto>(200)
            .Produces(400)
            .Produces(404)
            .Produces(409);

        group.MapPost("/{id:guid}/recall", RecallDocument)
            .WithName("RecallDocument")
            .WithSummary("FSM: Released → UnderReview (re-review; the shop floor falls back to the previous released version)")
            .Produces<DocumentDto>(200)
            .Produces(404)
            .Produces(409);

        group.MapPost("/{id:guid}/archive", ArchiveDocument)
            .WithName("ArchiveDocument")
            .WithSummary("FSM: Draft | Released → Archived (not allowed during review)")
            .Produces<DocumentDto>(200)
            .Produces(404)
            .Produces(409);

        group.MapPost("/{id:guid}/reopen", ReopenDocument)
            .WithName("ReopenDocument")
            .WithSummary("FSM: Archived → Draft (reopen as working copy)")
            .Produces<DocumentDto>(200)
            .Produces(404)
            .Produces(409);

        group.MapPost("/{id:guid}/versions", UploadVersion)
            .WithName("UploadDocumentVersion")
            .WithSummary("New version: number +1, chain preserved, Draft working copy (archived → 409; missing fields → 400)")
            .Produces<DocumentDto>(200)
            .Produces(400)
            .Produces(404)
            .Produces(409);

        return app;
    }

    // ============ HANDLERS ============

    private static async Task<IResult> ListDocuments(
        [FromServices] IMediator mediator,
        [FromQuery(Name = "status")] string? status,
        [FromQuery(Name = "type")] string? type,
        [FromQuery(Name = "linkType")] string? linkType,
        [FromQuery(Name = "q")] string? q,
        [FromQuery(Name = "expiring")] bool? expiring,
        CancellationToken ct)
    {
        // Module pattern: enums travel as strings, parsed with TryParse — invalid → 400
        if (!TryParseFilter<DocumentStatus>(status, out var statusFilter))
            return BadRequest("Érvénytelen státusz-szűrő");
        if (!TryParseFilter<DocType>(type, out var typeFilter))
            return BadRequest("Érvénytelen típus-szűrő");
        if (!TryParseFilter<DocLinkType>(linkType, out var linkTypeFilter))
            return BadRequest("Érvénytelen kapcsolat-szűrő");

        var query = new ListDocumentsQuery(
            Status: statusFilter,
            Type: typeFilter,
            LinkType: linkTypeFilter,
            Search: q,
            ExpiringOnly: expiring == true);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetDocument(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        CancellationToken ct)
    {
        var result = await mediator.Send(new GetDocumentQuery(id), ct).ConfigureAwait(false);
        return result is null ? NotFound() : Results.Ok(result);
    }

    private static Task<IResult> CreateDocument(
        [FromBody] CreateDocumentRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        [FromServices] ILoggerFactory loggerFactory,
        CancellationToken ct)
        => Execute(loggerFactory, "create", async () =>
        {
            // Tenant comes from the JWT (ADR-061): the tenancy middleware rejects
            // tenant-less callers with 403 before this handler runs, and the
            // adapter-backed ITenantContext is fail-loud — no Guid.Empty fallback.
            if (!Enum.TryParse<DocType>(request.Type, ignoreCase: true, out var docType))
                return BadRequest("Érvénytelen dokumentum-típus");

            var docLinkType = DocLinkType.None;
            if (request.LinkType is not null
                && !Enum.TryParse(request.LinkType, ignoreCase: true, out docLinkType))
            {
                return BadRequest("Érvénytelen kapcsolat-típus");
            }

            var command = new CreateDocumentCommand(
                TenantId: tenantContext.TenantId,
                Name: request.Name,
                Type: docType,
                LinkType: docLinkType,
                LinkId: request.LinkId,
                LinkLabel: request.LinkLabel ?? string.Empty,
                Owner: request.Owner,
                Note: request.Note,
                FileLabel: request.FileLabel,
                ValidUntil: request.ValidUntil);

            var dto = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/dms/documents/{dto.Id}", dto);
        });

    private static Task<IResult> SubmitDocument(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        CancellationToken ct)
        => ExecuteTransition(mediator, loggerFactory, new SubmitDocumentCommand(id), "submit", ct);

    private static Task<IResult> ApproveDocument(
        [FromRoute] Guid id,
        [FromBody] ApproveDocumentRequest? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        CancellationToken ct)
        => ExecuteTransition(mediator, loggerFactory, new ApproveDocumentCommand(id, request?.Note), "approve", ct);

    private static Task<IResult> RejectDocument(
        [FromRoute] Guid id,
        [FromBody] RejectDocumentRequest? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        CancellationToken ct)
        => ExecuteTransition(mediator, loggerFactory, new RejectDocumentCommand(id, request?.Reason), "reject", ct);

    private static Task<IResult> RecallDocument(
        [FromRoute] Guid id,
        [FromBody] RecallDocumentRequest? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        CancellationToken ct)
        => ExecuteTransition(mediator, loggerFactory, new RecallDocumentCommand(id, request?.Reason), "recall", ct);

    private static Task<IResult> ArchiveDocument(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        CancellationToken ct)
        => ExecuteTransition(mediator, loggerFactory, new ArchiveDocumentCommand(id), "archive", ct);

    private static Task<IResult> ReopenDocument(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        CancellationToken ct)
        => ExecuteTransition(mediator, loggerFactory, new ReopenDocumentCommand(id), "reopen", ct);

    private static Task<IResult> UploadVersion(
        [FromRoute] Guid id,
        [FromBody] UploadVersionRequest? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        CancellationToken ct)
        => Execute(loggerFactory, "uploadVersion", async () =>
        {
            var command = new UploadDocumentVersionCommand(
                id, request?.FileLabel, request?.Note, request?.UploadedBy);

            var dto = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Ok(dto);
        });

    // ============ SHARED EXECUTION (module error contract) ============

    /// <summary>
    /// Shared transition execution: run the command, return the fresh DTO
    /// (portal contract: the UI reconciles optimistic updates from the body).
    /// </summary>
    private static Task<IResult> ExecuteTransition<TCommand>(
        IMediator mediator,
        ILoggerFactory loggerFactory,
        TCommand command,
        string action,
        CancellationToken ct)
        where TCommand : IRequest<DocumentDto>
        => Execute(loggerFactory, action, async () =>
        {
            var dto = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Ok(dto);
        });

    /// <summary>
    /// Module error contract (MSW jsonError body mirror): 404 unknown id,
    /// 409 FSM guard (InvalidStatusTransitionException), 400 payload guard
    /// (DomainException). Guard rejections are logged at Warning.
    /// </summary>
    private static async Task<IResult> Execute(
        ILoggerFactory loggerFactory,
        string action,
        Func<Task<IResult>> body)
    {
        var logger = loggerFactory.CreateLogger(LoggerCategory);
        try
        {
            return await body().ConfigureAwait(false);
        }
        catch (KeyNotFoundException)
        {
            logger.LogWarning("DMS document {Action}: not found", action);
            return NotFound();
        }
        catch (InvalidStatusTransitionException ex)
        {
            logger.LogWarning("DMS document {Action} rejected (409): {Message}", action, ex.Message);
            return Results.Json(new ErrorBody("Conflict", ex.Message), statusCode: StatusCodes.Status409Conflict);
        }
        catch (DomainException ex)
        {
            logger.LogWarning("DMS document {Action} invalid (400): {Message}", action, ex.Message);
            return BadRequest(ex.Message);
        }
    }

    private static IResult NotFound()
        => Results.Json(new ErrorBody("NotFound", "Dokumentum nem található"), statusCode: StatusCodes.Status404NotFound);

    private static IResult BadRequest(string message)
        => Results.Json(new ErrorBody("BadRequest", message), statusCode: StatusCodes.Status400BadRequest);

    private static bool TryParseFilter<TEnum>(string? value, out TEnum? parsed)
        where TEnum : struct, Enum
    {
        parsed = null;
        if (string.IsNullOrWhiteSpace(value))
            return true;

        if (!Enum.TryParse<TEnum>(value, ignoreCase: true, out var result))
            return false;

        parsed = result;
        return true;
    }
}

/// <summary>MSW jsonError body mirror: {error, message}.</summary>
public record ErrorBody(string Error, string Message);

// Request DTOs (module pattern: enums travel as strings, parsed with TryParse)

public record CreateDocumentRequest(
    string Name,
    string Type,
    string? LinkType,
    string? LinkId,
    string? LinkLabel,
    string Owner,
    string? Note,
    string FileLabel,
    DateOnly? ValidUntil);

public record ApproveDocumentRequest(string? Note);

public record RejectDocumentRequest(string? Reason);

public record RecallDocumentRequest(string? Reason);

/// <summary>Portal payload: {fileLabel, note}; uploadedBy is optional until auth integration.</summary>
public record UploadVersionRequest(string? FileLabel, string? Note, string? UploadedBy);
