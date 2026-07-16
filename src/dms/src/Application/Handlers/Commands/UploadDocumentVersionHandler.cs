using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Application.Configuration;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Application.Mapping;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Application.Handlers.Commands;

/// <summary>
/// Uploads a new version (portal POST /documents/:id/versions mirror):
/// version number +1, earlier entries preserved, the new version is a Draft
/// working copy. Guards live in the domain (archived → 409, missing fields →
/// 400 — MSW mirrors). Real file content is the IDocumentBlobStore follow-up
/// (the wire carries only fileLabel until the multipart flow lands).
/// </summary>
public class UploadDocumentVersionHandler : IRequestHandler<UploadDocumentVersionCommand, DocumentDto>
{
    private readonly IDocumentRepository _repository;
    private readonly DmsExpiryOptions _expiryOptions;
    private readonly ILogger<UploadDocumentVersionHandler> _logger;

    public UploadDocumentVersionHandler(
        IDocumentRepository repository,
        DmsExpiryOptions expiryOptions,
        ILogger<UploadDocumentVersionHandler> logger)
    {
        _repository = repository;
        _expiryOptions = expiryOptions;
        _logger = logger;
    }

    public async Task<DocumentDto> Handle(UploadDocumentVersionCommand request, CancellationToken ct)
    {
        var document = await _repository
            .GetByIdAsync(new DocumentId(request.DocumentId), ct)
            .ConfigureAwait(false)
            ?? throw new KeyNotFoundException("Dokumentum nem található");

        var entry = document.AddVersion(
            request.FileLabel ?? string.Empty,
            request.ChangeNote ?? string.Empty,
            request.UploadedBy);

        await _repository.UpdateAsync(document, ct).ConfigureAwait(false);

        _logger.LogInformation(
            "DMS document {DocumentId} new version v{Version} recorded ({FileLabel})",
            request.DocumentId, entry.VersionNumber, entry.FileLabel);

        return DocumentDtoMapper.ToDto(document, ServeDay.Today(), _expiryOptions.WarnDays);
    }
}
