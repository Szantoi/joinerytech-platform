namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Domain service for blob storage operations (file upload/download).
/// </summary>
public interface IBlobStorageService
{
    string Upload(Guid tenantId, Guid documentId, int versionNumber, string fileName, Stream fileStream);
    Stream Download(string fileUrl);
    void Delete(string fileUrl);
    string GetPresignedUrl(string fileUrl, TimeSpan expiry);
}
