using Ardalis.Result;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.JoineryTech.Application.Auth.DTOs;
using SpaceOS.Modules.JoineryTech.Application.Contracts;
using SpaceOS.Modules.JoineryTech.Domain.Entities;
using SpaceOS.Modules.JoineryTech.Application.Data;

namespace SpaceOS.Modules.JoineryTech.Application.Auth.Commands;

/// <summary>
/// Handler for LoginCommand.
/// Validates credentials, generates tokens, and creates refresh token record.
/// </summary>
public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, Result<LoginResponse>>
{
    private readonly JoineryTechDbContext _dbContext;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<LoginCommandHandler> _logger;

    public LoginCommandHandler(
        JoineryTechDbContext dbContext,
        ITokenService tokenService,
        IPasswordHasher passwordHasher,
        ILogger<LoginCommandHandler> logger)
    {
        _dbContext = dbContext;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task<Result<LoginResponse>> Handle(LoginCommand request, CancellationToken ct)
    {
        // 1. Find user by email (case-insensitive)
        var user = await _dbContext.Users
            .Include(u => u.Tenant)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower(), ct)
            .ConfigureAwait(false);

        if (user is null)
        {
            _logger.LogWarning("Login attempt for non-existent email: {Email}", request.Email);
            return Result.Unauthorized();
        }

        // 2. Verify password
        if (!_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Failed login attempt for user {UserId} (invalid password)", user.Id);
            return Result.Unauthorized();
        }

        // 3. Check user status
        if (user.Status != UserStatus.Active)
        {
            _logger.LogWarning("Login attempt for {Status} user {UserId}", user.Status, user.Id);
            return Result.Forbidden();
        }

        // 4. Check tenant status
        if (user.Tenant.Status != TenantStatus.Active)
        {
            _logger.LogWarning("Login attempt for {Status} tenant {TenantId}", user.Tenant.Status, user.TenantId);
            return Result.Forbidden();
        }

        // 5. Generate access token
        var accessToken = await _tokenService.GenerateAccessTokenAsync(user, ct).ConfigureAwait(false);

        // 6. Generate refresh token
        var refreshTokenValue = _tokenService.GenerateRefreshToken();
        var refreshTokenHash = _tokenService.HashRefreshToken(refreshTokenValue);

        // 7. Create refresh token entity
        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            DeviceName = request.DeviceName,
            DeviceFingerprint = request.DeviceFingerprint,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            CreatedAt = DateTimeOffset.UtcNow
        };

        // 8. Save refresh token to database
        _dbContext.RefreshTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        // 9. Update last login timestamp
        user.LastLoginAt = DateTimeOffset.UtcNow;
        _dbContext.Users.Update(user);
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        _logger.LogInformation("User {UserId} logged in successfully", user.Id);

        // 10. Return login response
        return Result.Success(new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshTokenValue,
            User = new UserInfo
            {
                Id = user.Id,
                TenantId = user.TenantId,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Roles = user.Roles,
                Permissions = user.Permissions
            }
        });
    }
}
