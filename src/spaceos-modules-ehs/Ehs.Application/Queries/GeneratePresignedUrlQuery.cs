// Ehs.Application/Queries/GeneratePresignedUrlQuery.cs

using Ardalis.Result;
using Ehs.Application.DTOs;
using Ehs.Domain.Interfaces;
using FluentValidation;
using MediatR;

namespace Ehs.Application.Queries;

/// <summary>
/// Query to generate a presigned URL for photo upload.
/// </summary>
public sealed record GeneratePresignedUrlQuery(
    string Filename,
    long Size,
    string Mime) : IRequest<Result<PresignedUrlResponse>>;

/// <summary>
/// Validator for GeneratePresignedUrlQuery.
/// </summary>
public sealed class GeneratePresignedUrlQueryValidator : AbstractValidator<GeneratePresignedUrlQuery>
{
    public GeneratePresignedUrlQueryValidator()
    {
        RuleFor(x => x.Filename)
            .NotEmpty()
            .MaximumLength(255)
            .WithMessage("Filename is required and must not exceed 255 characters.");

        RuleFor(x => x.Size)
            .GreaterThan(0)
            .LessThanOrEqualTo(5_242_880) // 5MB
            .WithMessage("File size must be between 1 byte and 5MB.");

        RuleFor(x => x.Mime)
            .NotEmpty()
            .Must(m => m == "image/jpeg" || m == "image/png")
            .WithMessage("MIME type must be image/jpeg or image/png.");
    }
}

/// <summary>
/// Handler for GeneratePresignedUrlQuery.
/// </summary>
public sealed class GeneratePresignedUrlQueryHandler : IRequestHandler<GeneratePresignedUrlQuery, Result<PresignedUrlResponse>>
{
    private readonly IS3Service _s3Service;

    public GeneratePresignedUrlQueryHandler(IS3Service s3Service)
    {
        _s3Service = s3Service;
    }

    public async Task<Result<PresignedUrlResponse>> Handle(GeneratePresignedUrlQuery request, CancellationToken ct)
    {
        // Generate presigned URL (15 min TTL)
        var (uploadUrl, s3Key, expiresAt) = await _s3Service.GeneratePresignedUploadUrlAsync(
            request.Filename,
            request.Mime,
            request.Size).ConfigureAwait(false);

        return Result<PresignedUrlResponse>.Success(new PresignedUrlResponse
        {
            UploadUrl = uploadUrl,
            S3Key = s3Key,
            ExpiresAt = expiresAt
        });
    }
}
