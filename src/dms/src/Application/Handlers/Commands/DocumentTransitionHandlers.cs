using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Application.Configuration;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Application.Mapping;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Application.Handlers.Commands;

/// <summary>
/// Shared FSM-transition handling (Maintenance WorkOrderTransitionHandlerBase
/// precedent): load → domain action → persist → fresh DTO. Domain guard
/// exceptions bubble to the endpoint layer (module error contract:
/// KeyNotFoundException → 404, InvalidStatusTransitionException → 409,
/// DomainException → 400).
/// </summary>
public abstract class DocumentTransitionHandlerBase<TCommand> : IRequestHandler<TCommand, DocumentDto>
    where TCommand : IRequest<DocumentDto>, IDocumentTransitionCommand
{
    private readonly IDocumentRepository _repository;
    private readonly DmsExpiryOptions _expiryOptions;
    private readonly ILogger _logger;

    protected DocumentTransitionHandlerBase(
        IDocumentRepository repository,
        DmsExpiryOptions expiryOptions,
        ILogger logger)
    {
        _repository = repository;
        _expiryOptions = expiryOptions;
        _logger = logger;
    }

    /// <summary>Action name for logging (portal action key).</summary>
    protected abstract string ActionName { get; }

    /// <summary>Invokes the aggregate's transition method (guards live in the domain).</summary>
    protected abstract void Apply(Document document, TCommand command);

    public async Task<DocumentDto> Handle(TCommand command, CancellationToken ct)
    {
        var document = await _repository
            .GetByIdAsync(new DocumentId(command.DocumentId), ct)
            .ConfigureAwait(false)
            ?? throw new KeyNotFoundException("Dokumentum nem található");

        Apply(document, command);
        await _repository.UpdateAsync(document, ct).ConfigureAwait(false);

        _logger.LogInformation(
            "DMS document {DocumentId} {Action} → {Status} (v{Version})",
            command.DocumentId, ActionName, document.Status, document.CurrentVersion);

        return DocumentDtoMapper.ToDto(document, ServeDay.Today(), _expiryOptions.WarnDays);
    }
}

/// <summary>submit — Draft → UnderReview.</summary>
public class SubmitDocumentHandler : DocumentTransitionHandlerBase<SubmitDocumentCommand>
{
    public SubmitDocumentHandler(
        IDocumentRepository repository, DmsExpiryOptions expiryOptions, ILogger<SubmitDocumentHandler> logger)
        : base(repository, expiryOptions, logger) { }

    protected override string ActionName => "submit";
    protected override void Apply(Document document, SubmitDocumentCommand command)
        => document.SubmitForReview();
}

/// <summary>approve — UnderReview → Released.</summary>
public class ApproveDocumentHandler : DocumentTransitionHandlerBase<ApproveDocumentCommand>
{
    public ApproveDocumentHandler(
        IDocumentRepository repository, DmsExpiryOptions expiryOptions, ILogger<ApproveDocumentHandler> logger)
        : base(repository, expiryOptions, logger) { }

    protected override string ActionName => "approve";
    protected override void Apply(Document document, ApproveDocumentCommand command)
        => document.Approve(command.Note);
}

/// <summary>reject — UnderReview → Draft (mandatory reason; the domain guards it).</summary>
public class RejectDocumentHandler : DocumentTransitionHandlerBase<RejectDocumentCommand>
{
    public RejectDocumentHandler(
        IDocumentRepository repository, DmsExpiryOptions expiryOptions, ILogger<RejectDocumentHandler> logger)
        : base(repository, expiryOptions, logger) { }

    protected override string ActionName => "reject";
    protected override void Apply(Document document, RejectDocumentCommand command)
        => document.Reject(command.Reason ?? string.Empty);
}

/// <summary>recall — Released → UnderReview.</summary>
public class RecallDocumentHandler : DocumentTransitionHandlerBase<RecallDocumentCommand>
{
    public RecallDocumentHandler(
        IDocumentRepository repository, DmsExpiryOptions expiryOptions, ILogger<RecallDocumentHandler> logger)
        : base(repository, expiryOptions, logger) { }

    protected override string ActionName => "recall";
    protected override void Apply(Document document, RecallDocumentCommand command)
        => document.Recall(command.Reason);
}

/// <summary>archive — Draft | Released → Archived.</summary>
public class ArchiveDocumentHandler : DocumentTransitionHandlerBase<ArchiveDocumentCommand>
{
    public ArchiveDocumentHandler(
        IDocumentRepository repository, DmsExpiryOptions expiryOptions, ILogger<ArchiveDocumentHandler> logger)
        : base(repository, expiryOptions, logger) { }

    protected override string ActionName => "archive";
    protected override void Apply(Document document, ArchiveDocumentCommand command)
        => document.Archive();
}

/// <summary>reopen — Archived → Draft.</summary>
public class ReopenDocumentHandler : DocumentTransitionHandlerBase<ReopenDocumentCommand>
{
    public ReopenDocumentHandler(
        IDocumentRepository repository, DmsExpiryOptions expiryOptions, ILogger<ReopenDocumentHandler> logger)
        : base(repository, expiryOptions, logger) { }

    protected override string ActionName => "reopen";
    protected override void Apply(Document document, ReopenDocumentCommand command)
        => document.Reopen();
}
