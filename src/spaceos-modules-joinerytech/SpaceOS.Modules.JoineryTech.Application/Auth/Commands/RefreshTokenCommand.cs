using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.JoineryTech.Application.Auth.DTOs;

namespace SpaceOS.Modules.JoineryTech.Application.Auth.Commands;

/// <summary>
/// Command for refreshing an access token using a refresh token.
/// Returns a new access token (refresh token remains unchanged).
/// </summary>
public sealed record RefreshTokenCommand : IRequest<Result<TokenResponse>>
{
    public required string RefreshToken { get; init; }
    public string? DeviceFingerprint { get; init; }
}
