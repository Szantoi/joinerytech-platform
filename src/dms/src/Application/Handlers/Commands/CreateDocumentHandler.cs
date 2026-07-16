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
/// Creates a document with its v1 Draft working copy and returns the fresh DTO
/// (portal contract: mutation responses carry the full document).
/// </summary>
public class CreateDocumentHandler : IRequestHandler<CreateDocumentCommand, DocumentDto>
{
    private readonly IDocumentRepository _repository;
    private readonly DmsExpiryOptions _expiryOptions;
    private readonly ILogger<CreateDocumentHandler> _logger;

    public CreateDocumentHandler(
        IDocumentRepository repository,
        DmsExpiryOptions expiryOptions,
        ILogger<CreateDocumentHandler> logger)
    {
        _repository = repository;
        _expiryOptions = expiryOptions;
        _logger = logger;
    }

    public async Task<DocumentDto> Handle(CreateDocumentCommand request, CancellationToken ct)
    {
        var document = Document.Create(
            new TenantId(request.TenantId),
            request.Name,
            request.Type,
            request.LinkType,
            request.LinkId,
            request.LinkLabel,
            request.Owner,
            request.Note,
            request.FileLabel,
            request.ValidUntil);

        await _repository.AddAsync(document, ct).ConfigureAwait(false);

        _logger.LogInformation(
            "DMS document {DocumentId} created ({Type}, {LinkType}) for tenant {TenantId}",
            document.Id.Value, document.Type, document.LinkType, request.TenantId);

        return DocumentDtoMapper.ToDto(document, ServeDay.Today(), _expiryOptions.WarnDays);
    }
}
