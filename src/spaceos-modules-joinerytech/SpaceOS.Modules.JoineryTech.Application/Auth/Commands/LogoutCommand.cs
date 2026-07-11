using Ardalis.Result;
using MediatR;

namespace SpaceOS.Modules.JoineryTech.Application.Auth.Commands;

/// <summary>
/// Command for user logout (revokes refresh token).
/// Access token cannot be revoked (stateless JWT), but will expire in 15 minutes.
/// </summary>
public sealed record LogoutCommand : IRequest<Result>
{
    public required string RefreshToken { get; init; }
}
