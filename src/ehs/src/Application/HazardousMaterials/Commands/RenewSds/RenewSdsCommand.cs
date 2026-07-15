using MediatR;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.RenewSds;

/// <summary>
/// Command to register a new SDS version for a hazardous material
/// (RenewTrainingRecord pattern: new issue/expiry dates + optional DMS document)
/// </summary>
public record RenewSdsCommand(
    Guid MaterialId,
    Guid TenantId,
    DateTimeOffset NewIssuedAt,
    DateTimeOffset NewExpiresAt,
    Guid? NewSdsDocumentId
) : IRequest<Unit>;
