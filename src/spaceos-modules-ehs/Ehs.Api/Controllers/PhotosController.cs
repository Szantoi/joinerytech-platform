// Ehs.Api/Controllers/PhotosController.cs

using Ardalis.Result.AspNetCore;
using Ehs.Application.DTOs;
using Ehs.Application.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ehs.Api.Controllers;

/// <summary>
/// Controller for EHS photo presigned URL generation.
/// </summary>
[ApiController]
[Route("api/ehs/photos")]
[Authorize]
public sealed class PhotosController : ControllerBase
{
    private readonly IMediator _mediator;

    public PhotosController(IMediator mediator) => _mediator = mediator;

    /// <summary>
    /// Generate a presigned URL for photo upload.
    /// POST /api/ehs/photos/presigned-url
    /// </summary>
    [HttpPost("presigned-url")]
    public async Task<ActionResult<PresignedUrlResponse>> GeneratePresignedUrl(
        [FromBody] GeneratePresignedUrlRequest request,
        CancellationToken ct)
    {
        var query = new GeneratePresignedUrlQuery(
            request.Filename,
            request.Size,
            request.Mime);

        var result = await _mediator.Send(query, ct).ConfigureAwait(false);

        return this.ToActionResult(result);
    }
}

/// <summary>
/// Request DTO for presigned URL generation.
/// </summary>
public sealed record GeneratePresignedUrlRequest
{
    public string Filename { get; init; } = string.Empty;
    public long Size { get; init; }
    public string Mime { get; init; } = string.Empty;
}
