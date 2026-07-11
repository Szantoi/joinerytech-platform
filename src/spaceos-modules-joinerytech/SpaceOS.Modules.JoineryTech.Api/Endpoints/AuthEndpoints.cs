using Ardalis.Result;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using SpaceOS.Modules.JoineryTech.Application.Auth.Commands;
using SpaceOS.Modules.JoineryTech.Application.Auth.DTOs;

namespace SpaceOS.Modules.JoineryTech.Api.Endpoints;

/// <summary>
/// Authentication endpoints (login, refresh, logout).
/// OAuth 2.0 Authorization Code Flow compliant.
/// </summary>
public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth")
            .WithTags("Authentication")
            .WithOpenApi();

        // POST /api/v1/auth/login
        group.MapPost("/login", async (
            [FromBody] LoginRequest request,
            [FromServices] IMediator mediator,
            CancellationToken ct) =>
        {
            var command = new LoginCommand
            {
                Email = request.Email,
                Password = request.Password,
                DeviceName = request.DeviceName,
                DeviceFingerprint = request.DeviceFingerprint
            };

            var result = await mediator.Send(command, ct).ConfigureAwait(false);

            return result.Status switch
            {
                ResultStatus.Unauthorized => Results.Unauthorized(),
                ResultStatus.Forbidden => Results.Problem(
                    statusCode: 403,
                    title: "Forbidden",
                    detail: "User or tenant is not active"),
                ResultStatus.Ok => Results.Ok(result.Value),
                _ => Results.Problem(
                    statusCode: 500,
                    title: "Internal Server Error")
            };
        })
        .WithName("Login")
        .WithSummary("User login with email and password")
        .WithDescription("Returns JWT access token (ES256, 15min expiry) and refresh token (7 days expiry)")
        .Produces<LoginResponse>(200)
        .Produces(401)
        .Produces(403)
        .AllowAnonymous();

        // POST /api/v1/auth/refresh
        group.MapPost("/refresh", async (
            [FromBody] RefreshTokenRequest request,
            [FromServices] IMediator mediator,
            CancellationToken ct) =>
        {
            var command = new RefreshTokenCommand
            {
                RefreshToken = request.RefreshToken,
                DeviceFingerprint = request.DeviceFingerprint
            };

            var result = await mediator.Send(command, ct).ConfigureAwait(false);

            return result.Status switch
            {
                ResultStatus.Unauthorized => Results.Unauthorized(),
                ResultStatus.Forbidden => Results.Problem(
                    statusCode: 403,
                    title: "Forbidden",
                    detail: "User or tenant is not active"),
                ResultStatus.Ok => Results.Ok(result.Value),
                _ => Results.Problem(
                    statusCode: 500,
                    title: "Internal Server Error")
            };
        })
        .WithName("RefreshToken")
        .WithSummary("Refresh access token using refresh token")
        .WithDescription("Returns new JWT access token (refresh token remains unchanged)")
        .Produces<TokenResponse>(200)
        .Produces(401)
        .Produces(403)
        .AllowAnonymous();

        // POST /api/v1/auth/logout
        group.MapPost("/logout", async (
            [FromBody] LogoutRequest request,
            [FromServices] IMediator mediator,
            CancellationToken ct) =>
        {
            var command = new LogoutCommand
            {
                RefreshToken = request.RefreshToken
            };

            var result = await mediator.Send(command, ct).ConfigureAwait(false);

            return result.Status switch
            {
                ResultStatus.NotFound => Results.NotFound(new { message = "Refresh token not found" }),
                ResultStatus.Ok => Results.Ok(new { message = "Logged out successfully" }),
                _ => Results.Problem(
                    statusCode: 500,
                    title: "Internal Server Error")
            };
        })
        .WithName("Logout")
        .WithSummary("User logout (revokes refresh token)")
        .WithDescription("Revokes the refresh token. Access token cannot be revoked (stateless) but expires in 15 minutes.")
        .Produces(200)
        .Produces(404)
        .AllowAnonymous();
    }
}

/// <summary>
/// Logout request DTO.
/// </summary>
public sealed record LogoutRequest
{
    public required string RefreshToken { get; init; }
}
