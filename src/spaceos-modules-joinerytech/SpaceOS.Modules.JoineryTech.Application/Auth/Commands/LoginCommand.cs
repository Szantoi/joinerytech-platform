using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.JoineryTech.Application.Auth.DTOs;

namespace SpaceOS.Modules.JoineryTech.Application.Auth.Commands;

/// <summary>
/// Command for user login (email + password authentication).
/// Returns JWT access token and refresh token on success.
/// </summary>
public sealed record LoginCommand : IRequest<Result<LoginResponse>>
{
    public required string Email { get; init; }
    public required string Password { get; init; }
    public string? DeviceName { get; init; }
    public string? DeviceFingerprint { get; init; }
}
