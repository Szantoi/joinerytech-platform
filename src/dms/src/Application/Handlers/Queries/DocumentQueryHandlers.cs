using MediatR;
using SpaceOS.Modules.DMS.Application.Configuration;
using SpaceOS.Modules.DMS.Application.Contracts;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Application.Mapping;
using SpaceOS.Modules.DMS.Application.Queries;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.Services;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Application.Handlers.Queries;

/// <summary>
/// Lists documents (portal list contract). The expiring window cutoff is
/// computed HERE from config (today + Dms:Expiry:WarnDays) so the repository
/// filter stays SQL-translatable; the per-document expiry state is then served
/// from the same calc mirror in the mapper.
/// </summary>
public class ListDocumentsHandler : IRequestHandler<ListDocumentsQuery, IReadOnlyList<DocumentDto>>
{
    private readonly IDocumentRepository _repository;
    private readonly DmsExpiryOptions _expiryOptions;

    public ListDocumentsHandler(IDocumentRepository repository, DmsExpiryOptions expiryOptions)
    {
        _repository = repository;
        _expiryOptions = expiryOptions;
    }

    public async Task<IReadOnlyList<DocumentDto>> Handle(ListDocumentsQuery request, CancellationToken ct)
    {
        var today = ServeDay.Today();

        var filter = new DocumentFilter(
            Status: request.Status,
            Type: request.Type,
            LinkType: request.LinkType,
            Search: request.Search,
            ExpiresOnOrBefore: request.ExpiringOnly ? today.AddDays(_expiryOptions.WarnDays) : null);

        var documents = await _repository.ListAsync(filter, ct).ConfigureAwait(false);

        return documents
            .Select(d => DocumentDtoMapper.ToDto(d, today, _expiryOptions.WarnDays))
            .ToList();
    }
}

/// <summary>Document detail with the full version chain; null → endpoint 404.</summary>
public class GetDocumentHandler : IRequestHandler<GetDocumentQuery, DocumentDto?>
{
    private readonly IDocumentRepository _repository;
    private readonly IDocumentAccessControlService _access;
    private readonly ICallerContext _caller;
    private readonly DmsExpiryOptions _expiryOptions;

    public GetDocumentHandler(
        IDocumentRepository repository,
        IDocumentAccessControlService access,
        ICallerContext caller,
        DmsExpiryOptions expiryOptions)
    {
        _repository = repository;
        _access = access;
        _caller = caller;
        _expiryOptions = expiryOptions;
    }

    public async Task<DocumentDto?> Handle(GetDocumentQuery request, CancellationToken ct)
    {
        var document = await _repository
            .GetByIdAsync(new DocumentId(request.DocumentId), ct)
            .ConfigureAwait(false);

        if (document is null)
        {
            return null;
        }

        // A document the caller may not view answers exactly like one that does not exist —
        // otherwise the difference between 404 and 403 becomes a way to enumerate documents.
        var caller = new DocumentAccessContext(new UserId(_caller.UserId), _caller.RoleIds);
        return _access.CanView(document, caller)
            ? DocumentDtoMapper.ToDto(document, ServeDay.Today(), _expiryOptions.WarnDays)
            : null;
    }
}
