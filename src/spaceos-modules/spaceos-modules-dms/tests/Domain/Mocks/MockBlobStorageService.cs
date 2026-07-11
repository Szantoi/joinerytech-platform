using SpaceOS.Modules.DMS.Domain.Services;

namespace SpaceOS.Modules.DMS.Tests.Domain.Mocks;

/// <summary>
/// Mock blob storage service for testing.
/// </summary>
public class MockBlobStorageService : IBlobStorageService
{
    private readonly Dictionary<string, byte[]> _storage = new();

    public Task<string> UploadAsync(Stream fileStream, string blobPath, string contentType, CancellationToken ct = default)
    {
        using var ms = new MemoryStream();
        fileStream.CopyTo(ms);
        _storage[blobPath] = ms.ToArray();
        return Task.FromResult($"https://mock-storage.local/{blobPath}");
    }

    public Task<Stream> DownloadAsync(string blobPath, CancellationToken ct = default)
    {
        if (_storage.TryGetValue(blobPath, out var data))
        {
            return Task.FromResult<Stream>(new MemoryStream(data));
        }
        throw new FileNotFoundException($"Blob not found: {blobPath}");
    }

    public Task DeleteAsync(string blobPath, CancellationToken ct = default)
    {
        _storage.Remove(blobPath);
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(string blobPath, CancellationToken ct = default)
    {
        return Task.FromResult(_storage.ContainsKey(blobPath));
    }
}
