namespace SpaceOS.Modules.Kontrolling.Application.Portfolio;

using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Maps a <see cref="CostAdjustment"/> to its wire shape.
/// </summary>
internal static class AdjustmentView
{
    /// <param name="codeById">
    /// Project business keys by internal id. The contract addresses projects by
    /// business key, but the entity references them by Guid.
    /// </param>
    public static CostAdjustmentViewDto From(
        CostAdjustment adjustment,
        IReadOnlyDictionary<Guid, string> codeById)
    {
        var projectCode = adjustment.ProjectId is { } id && codeById.TryGetValue(id, out var code)
            ? code
            : null;

        return new CostAdjustmentViewDto(
            Id: adjustment.AdjustmentId.ToString(),
            ProjectId: projectCode,
            Category: adjustment.Category,
            Amount: adjustment.Amount.Amount,
            Scope: adjustment.Scope,
            Reason: adjustment.Reason,
            // The audit user is stored as an id; the module has no user
            // directory to resolve a display name from. See the task doc's
            // follow-up (Keycloak profile lookup).
            CreatedBy: adjustment.CreatedBy.ToString(),
            CreatedAt: adjustment.CreatedAt);
    }
}

/// <summary>
/// Records a cost adjustment (post-calculation correction).
/// </summary>
/// <param name="ProjectCode">Business key; must be <c>null</c> for portfolio scope.</param>
/// <param name="Amount">Signed; negative is a credit. Zero is rejected.</param>
/// <param name="Reason">Mandatory — this is the audit trail.</param>
public sealed record CreateAdjustmentCommand(
    Guid TenantId,
    string? ProjectCode,
    CostCategory Category,
    decimal Amount,
    AdjustmentScope Scope,
    string Reason,
    Guid CreatedBy) : IRequest<Result<CostAdjustmentViewDto>>;

/// <summary>Soft-deletes a cost adjustment, preserving the audit trail.</summary>
public sealed record DeleteAdjustmentCommand(
    Guid TenantId,
    Guid AdjustmentId,
    Guid DeletedBy) : IRequest<Result>;

/// <inheritdoc cref="CreateAdjustmentCommand"/>
public sealed class CreateAdjustmentCommandHandler(
    IProjectPortfolioSource projects,
    ICostAdjustmentRepository adjustments,
    ILogger<CreateAdjustmentCommandHandler> logger)
    : IRequestHandler<CreateAdjustmentCommand, Result<CostAdjustmentViewDto>>
{
    public async Task<Result<CostAdjustmentViewDto>> Handle(
        CreateAdjustmentCommand request,
        CancellationToken ct)
    {
        // Payload guards (400). These mirror CostAdjustment.Create's invariants,
        // which throw. The entity stays the last line of defence; validating
        // here turns a would-be 500 into the contract's 400 with a usable
        // message. Order matches the client contract's.
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return Invalid(nameof(request.Reason), "A korrekció indoka kötelező (audit trail).");
        }

        if (request.Amount == 0)
        {
            return Invalid(nameof(request.Amount), "A korrekció összege nem lehet nulla.");
        }

        if (!Enum.IsDefined(request.Category))
        {
            return Invalid(nameof(request.Category), "Ismeretlen költség-kategória.");
        }

        if (request.Scope == AdjustmentScope.Project && string.IsNullOrWhiteSpace(request.ProjectCode))
        {
            return Invalid(
                nameof(request.ProjectCode),
                "Projekt-hatályú korrekcióhoz projekt megadása kötelező.");
        }

        if (request.Scope == AdjustmentScope.Portfolio && !string.IsNullOrWhiteSpace(request.ProjectCode))
        {
            return Invalid(
                nameof(request.ProjectCode),
                "Portfólió-hatályú korrekcióhoz nem adható meg projekt.");
        }

        // Unknown project (404) — checked after the payload guards, so a
        // malformed request never masquerades as a missing one.
        Guid? projectId = null;
        var codeById = new Dictionary<Guid, string>();

        if (request.Scope == AdjustmentScope.Project)
        {
            var project = await projects
                .GetProjectAsync(request.TenantId, request.ProjectCode!, ct)
                .ConfigureAwait(false);

            if (project is null)
            {
                return Result<CostAdjustmentViewDto>.NotFound("A projekt nem található.");
            }

            projectId = project.ProjectId;
            codeById[project.ProjectId] = project.ProjectCode;
        }

        var adjustment = CostAdjustment.Create(
            request.TenantId,
            projectId,
            request.Category,
            Money.FromHUF(request.Amount),
            request.Scope,
            request.Reason.Trim(),
            request.CreatedBy);

        await adjustments.AddAsync(adjustment, ct).ConfigureAwait(false);

        logger.LogInformation(
            "Cost adjustment {AdjustmentId} created: {Amount} HUF on {Category} " +
            "({Scope}, project {ProjectCode}) by {UserId}",
            adjustment.AdjustmentId, request.Amount, request.Category,
            request.Scope, request.ProjectCode ?? "-", request.CreatedBy);

        // A fresh DTO, not just the id: the client applies it optimistically.
        return Result<CostAdjustmentViewDto>.Success(AdjustmentView.From(adjustment, codeById));
    }

    private static Result<CostAdjustmentViewDto> Invalid(string field, string message) =>
        Result<CostAdjustmentViewDto>.Invalid(new ValidationError
        {
            Identifier = field,
            ErrorMessage = message
        });
}

/// <inheritdoc cref="DeleteAdjustmentCommand"/>
public sealed class DeleteAdjustmentCommandHandler(
    ICostAdjustmentRepository adjustments,
    ILogger<DeleteAdjustmentCommandHandler> logger)
    : IRequestHandler<DeleteAdjustmentCommand, Result>
{
    public async Task<Result> Handle(DeleteAdjustmentCommand request, CancellationToken ct)
    {
        // Tracked and including soft-deleted rows: the delete has to persist,
        // and an already-deleted row must be distinguishable from an unknown one.
        var adjustment = await adjustments
            .GetForUpdateAsync(request.AdjustmentId, request.TenantId, ct)
            .ConfigureAwait(false);

        if (adjustment is null)
        {
            return Result.NotFound("A korrekció nem található.");
        }

        if (adjustment.IsDeleted)
        {
            return Result.Conflict("A korrekció már törölve van.");
        }

        adjustment.Delete(request.DeletedBy);
        await adjustments.SaveChangesAsync(ct).ConfigureAwait(false);

        logger.LogInformation(
            "Cost adjustment {AdjustmentId} soft-deleted by {UserId}",
            request.AdjustmentId, request.DeletedBy);

        return Result.Success();
    }
}
