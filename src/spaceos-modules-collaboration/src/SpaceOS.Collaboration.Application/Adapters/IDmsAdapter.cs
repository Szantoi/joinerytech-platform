namespace SpaceOS.Collaboration.Application.Adapters;

public record DocumentReference(string DocumentRef, string Title, string ContentHash, long FileSizeBytes);

public interface IDmsAdapter
{
    Task<DocumentReference?> VerifyDocumentRefAsync(string documentRef, Guid requestingTenantId, CancellationToken cancellationToken = default);
}
