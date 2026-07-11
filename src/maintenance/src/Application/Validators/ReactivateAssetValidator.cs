using FluentValidation;
using SpaceOS.Modules.Maintenance.Application.Commands;

namespace SpaceOS.Modules.Maintenance.Application.Validators;

/// <summary>
/// Validator for ReactivateAssetCommand.
/// No special validation (AssetId + TenantId only).
/// </summary>
public class ReactivateAssetValidator : AbstractValidator<ReactivateAssetCommand>
{
    public ReactivateAssetValidator()
    {
        // No special validation required
    }
}
