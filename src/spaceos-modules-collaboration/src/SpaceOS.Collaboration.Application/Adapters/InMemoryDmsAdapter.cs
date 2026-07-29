namespace SpaceOS.Collaboration.Application.Adapters;

public class InMemoryDmsAdapter : IDmsAdapter
{
    private readonly Dictionary<string, DocumentReference> _documents = new();

    public void RegisterDocument(DocumentReference doc)
    {
        _documents[doc.DocumentRef] = doc;
    }

    public Task<DocumentReference?> VerifyDocumentRefAsync(string documentRef, Guid requestingTenantId, CancellationToken cancellationToken = default)
    {
        if (_documents.TryGetValue(documentRef, out var doc))
        {
            return Task.FromResult<DocumentReference?>(doc);
        }

        return Task.FromResult<DocumentReference?>(null);
    }
}
