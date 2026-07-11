using Ardalis.Result;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.JoineryTech.Application.Contracts;
using SpaceOS.Modules.JoineryTech.Application.Data;

namespace SpaceOS.Modules.JoineryTech.Application.Auth.Commands;

/// <summary>
/// Handler for LogoutCommand.
/// Revokes the refresh token by setting RevokedAt timestamp.
/// </summary>
public sealed class LogoutCommandHandler : IRequestHandler<LogoutCommand, Result>
{
    private readonly JoineryTechDbContext _dbContext;
    private readonly ITokenService _tokenService;
    private readonly ILogger<LogoutCommandHandler> _logger;

    public LogoutCommandHandler(
        JoineryTechDbContext dbContext,
        ITokenService tokenService,
        ILogger<LogoutCommandHandler> logger)
    {
        _dbContext = dbContext;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<Result> Handle(LogoutCommand request, CancellationToken ct)
    {
        // 1. Hash the provided refresh token
        var tokenHash = _tokenService.HashRefreshToken(request.RefreshToken);

        // 2. Find refresh token in database
        var refreshToken = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct)
            .ConfigureAwait(false);

        if (refreshToken is null)
        {
            _logger.LogWarning("Logout attempted with non-existent refresh token");
            return Result.NotFound();
        }

        // 3. Check if already revoked
        if (refreshToken.RevokedAt is not null)
        {
            _logger.LogInformation("Logout attempted with already revoked token for user {UserId}", refreshToken.UserId);
            return Result.Success();
        }

        // 4. Revoke the refresh token
        refreshToken.Revoke();
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        _logger.LogInformation("User {UserId} logged out (refresh token revoked)", refreshToken.UserId);

        return Result.Success();
    }
}
