using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Domain.ValueObjects;

/// <summary>
/// Inspection criteria value object (defines a single criterion to check)
/// </summary>
public record InspectionCriteria
{
    public required string Id { get; init; }
    public required CriteriaType Type { get; init; }
    public required string Description { get; init; }
    public string? AcceptanceThreshold { get; init; }

    private InspectionCriteria() { }

    public static InspectionCriteria Create(
        CriteriaType type,
        string description,
        string? acceptanceThreshold = null)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new DomainException("Description is required");

        return new InspectionCriteria
        {
            Id = Guid.NewGuid().ToString(),
            Type = type,
            Description = description,
            AcceptanceThreshold = acceptanceThreshold
        };
    }
}
