using Microsoft.Extensions.Logging;
using SpaceOS.Modules.DMS.Domain.Services;

namespace SpaceOS.Modules.DMS.Infrastructure.Blob;

/// <summary>
/// Filesystem stub of <see cref="IDocumentBlobStore"/> (DMS-BE-HOST) — the real
/// store (S3/MinIO/Azure Blob) is an infrastructure decision, follow-up.
///
/// Layout: {root}/{tenantId}/{documentId}/v{version}_{sanitized-fileLabel}
/// Root is CONFIG-DRIVEN: Dms:Blob:RootPath (default: "dms-blobs" under the
/// current directory). The blob path returned/accepted is store-relative with
/// '/' separators — an opaque identifier for the persistence layer.
/// </summary>
public class FileSystemDocumentBlobStore : IDocumentBlobStore
{
    /// <summary>Configuration key of the storage root.</summary>
    public const string RootPathConfigKey = "Dms:Blob:RootPath";

    /// <summary>Default root (relative to the working directory) when not configured.</summary>
    public const string DefaultRootPath = "dms-blobs";

    private readonly string _rootPath;
    private readonly ILogger<FileSystemDocumentBlobStore> _logger;

    public FileSystemDocumentBlobStore(string rootPath, ILogger<FileSystemDocumentBlobStore> logger)
    {
        _rootPath = Path.GetFullPath(rootPath);
        _logger = logger;
    }

    public async Task<string> SaveAsync(
        Guid tenantId,
        Guid documentId,
        int versionNumber,
        string fileLabel,
        Stream content,
        CancellationToken ct = default)
    {
        var blobPath = $"{tenantId}/{documentId}/v{versionNumber}_{Sanitize(fileLabel)}";
        var fullPath = ToFullPath(blobPath);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await using (var target = File.Create(fullPath))
        {
            await content.CopyToAsync(target, ct).ConfigureAwait(false);
        }

        _logger.LogInformation(
            "DMS blob saved: {BlobPath} (tenant {TenantId}, document {DocumentId}, v{Version})",
            blobPath, tenantId, documentId, versionNumber);

        return blobPath;
    }

    public Task<Stream> OpenReadAsync(string blobPath, CancellationToken ct = default)
    {
        var fullPath = ToFullPath(blobPath);
        if (!File.Exists(fullPath))
            throw new FileNotFoundException($"DMS blob not found: {blobPath}");

        return Task.FromResult<Stream>(File.OpenRead(fullPath));
    }

    public Task<bool> ExistsAsync(string blobPath, CancellationToken ct = default)
        => Task.FromResult(File.Exists(ToFullPath(blobPath)));

    public Task DeleteAsync(string blobPath, CancellationToken ct = default)
    {
        var fullPath = ToFullPath(blobPath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            _logger.LogInformation("DMS blob deleted: {BlobPath}", blobPath);
        }

        return Task.CompletedTask;
    }

    /// <summary>Resolves the store-relative path and guards against escaping the root.</summary>
    private string ToFullPath(string blobPath)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_rootPath, blobPath.Replace('/', Path.DirectorySeparatorChar)));
        if (!fullPath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Blob path escapes the storage root: {blobPath}");
        return fullPath;
    }

    /// <summary>Keeps letters/digits/dot/dash/underscore; anything else becomes '_'.</summary>
    private static string Sanitize(string fileLabel)
    {
        var safe = new string(fileLabel
            .Select(c => char.IsLetterOrDigit(c) || c is '.' or '-' or '_' ? c : '_')
            .ToArray());
        return string.IsNullOrWhiteSpace(safe) ? "file" : safe;
    }
}
