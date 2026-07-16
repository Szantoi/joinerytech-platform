using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using SpaceOS.Modules.DMS.Infrastructure.Blob;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Infrastructure;

/// <summary>
/// Filesystem blob-store stub tests (IDocumentBlobStore port — DMS-BE-HOST):
/// save/read round-trip, sanitized layout, idempotent delete and the
/// root-escape guard. Each test uses an isolated temp root.
/// </summary>
public sealed class FileSystemDocumentBlobStoreTests : IDisposable
{
    private readonly string _root;
    private readonly FileSystemDocumentBlobStore _store;

    public FileSystemDocumentBlobStoreTests()
    {
        _root = Path.Combine(Path.GetTempPath(), $"dms-blob-tests-{Guid.NewGuid():N}");
        _store = new FileSystemDocumentBlobStore(
            _root, NullLogger<FileSystemDocumentBlobStore>.Instance);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
            Directory.Delete(_root, recursive: true);
    }

    private static MemoryStream Content(string text) => new(Encoding.UTF8.GetBytes(text));

    [Fact]
    public async Task SaveAsync_RoundTrip_PersistsAndReadsBack()
    {
        var tenantId = Guid.NewGuid();
        var documentId = Guid.NewGuid();

        var blobPath = await _store.SaveAsync(
            tenantId, documentId, 1, "petofi-konyha-kiviteli-v1.pdf", Content("PDF-TARTALOM"));

        blobPath.Should().Be($"{tenantId}/{documentId}/v1_petofi-konyha-kiviteli-v1.pdf");
        (await _store.ExistsAsync(blobPath)).Should().BeTrue();

        await using var stream = await _store.OpenReadAsync(blobPath);
        using var reader = new StreamReader(stream);
        (await reader.ReadToEndAsync()).Should().Be("PDF-TARTALOM");
    }

    [Fact]
    public async Task SaveAsync_SanitizesUnsafeFileLabelCharacters()
    {
        var blobPath = await _store.SaveAsync(
            Guid.NewGuid(), Guid.NewGuid(), 2, "raj z/..\\v2?.pdf", Content("x"));

        // ' ' → '_', '/' → '_', '\' → '_', '?' → '_'; dots are kept (file name
        // segment only — the root-escape guard covers path traversal)
        blobPath.Should().EndWith("/v2_raj_z_.._v2_.pdf");
        (await _store.ExistsAsync(blobPath)).Should().BeTrue();
    }

    [Fact]
    public async Task DeleteAsync_IsIdempotent()
    {
        var blobPath = await _store.SaveAsync(
            Guid.NewGuid(), Guid.NewGuid(), 1, "t.pdf", Content("x"));

        await _store.DeleteAsync(blobPath);
        (await _store.ExistsAsync(blobPath)).Should().BeFalse();

        // Missing blob → no-op, no exception
        var act = () => _store.DeleteAsync(blobPath);
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task OpenReadAsync_EscapingBlobPath_IsRejected()
    {
        var act = () => _store.OpenReadAsync("../../secrets.txt");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*escapes the storage root*");
    }

    [Fact]
    public async Task OpenReadAsync_MissingBlob_ThrowsFileNotFound()
    {
        var act = () => _store.OpenReadAsync($"{Guid.NewGuid()}/{Guid.NewGuid()}/v1_x.pdf");

        await act.Should().ThrowAsync<FileNotFoundException>();
    }
}
