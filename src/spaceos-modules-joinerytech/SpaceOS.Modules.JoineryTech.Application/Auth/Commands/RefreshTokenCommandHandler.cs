using Ardalis.Result;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.JoineryTech.Application.Auth.DTOs;
using SpaceOS.Modules.JoineryTech.Application.Contracts;
using SpaceOS.Modules.JoineryTech.Application.Data;

namespace SpaceOS.Modules.JoineryTech.Application.Auth.Commands;

/// <summary>
/// Handler for RefreshTokenCommand.
/// Validates refresh token and generates a new access token.
/// </summary>
public sealed class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, Result<TokenResponse>>
{
    private readonly JoineryTechDbContext _dbContext;
    private readonly ITokenService _tokenService;
    private readonly ILogger<RefreshTokenCommandHandler> _logger;

    public RefreshTokenCommandHandler(
        JoineryTechDbContext dbContext,
        ITokenService tokenService,
        ILogger<RefreshTokenCommandHandler> logger)
    {
        _dbContext = dbContext;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<Result<TokenResponse>> Handle(RefreshTokenCommand request, CancellationToken ct)
    {
        // 1. Hash the provided refresh token
        var tokenHash = _tokenService.HashRefreshToken(request.RefreshToken);

        // 2. Find refresh token in database
        var refreshToken = await _dbContext.RefreshTokens
            .Include(rt => rt.User)
            .ThenInclude(u => u.Tenant)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct)
            .ConfigureAwait(false);

        if (refreshToken is null)
        {
            _logger.LogWarning("Refresh token not found in database");
            return Result.Unauthorized();
        }

        // 3. Validate refresh token
        if (!refreshToken.IsValid())
        {
            _logger.LogWarning("Invalid refresh token for user {UserId} (expired or revoked)", refreshToken.UserId);
            return Result.Unauthorized();
        }

        // 4. Optional: Validate device fingerprint if provided
        if (!string.IsNullOrWhiteSpace(request.DeviceFingerprint)
            && refreshToken.DeviceFingerprint != request.DeviceFingerprint)
        {
            _logger.LogWarning(
                "Device fingerprint mismatch for user {UserId} (expected: {Expected}, got: {Actual})",
                refreshToken.UserId,
                refreshToken.DeviceFingerprint,
                request.DeviceFingerprint);
            return Result.Unauthorized();
        }

        // 5. Check user status
        if (refreshToken.User.Status != Domain.Entities.UserStatus.Active)
        {
            _logger.LogWarning("Refresh token used by {Status} user {UserId}", refreshToken.User.Status, refreshToken.UserId);
            return Result.Forbidden();
        }

        // 6. Check tenant status
        if (refreshToken.User.Tenant.Status != Domain.Entities.TenantStatus.Active)
        {
            _logger.LogWarning("Refresh token used by {Status} tenant {TenantId}", refreshToken.User.Tenant.Status, refreshToken.User.TenantId);
            return Result.Forbidden();
        }

        // 7. Generate new access token
        var accessToken = await _tokenService.GenerateAccessTokenAsync(refreshToken.User, ct)
            .ConfigureAwait(false);

        _logger.LogInformation("Access token refreshed for user {UserId}", refreshToken.UserId);

        // 8. Return token response
        return Result.Success(new TokenResponse
        {
            AccessToken = accessToken
        });
    }
}
