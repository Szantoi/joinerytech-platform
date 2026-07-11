using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Domain.ValueObjects;

/// <summary>
/// Resolution action value object (describes an action taken to resolve a ticket)
/// </summary>
public record ResolutionAction
{
    public required string Id { get; init; }
    public required ActionType ActionType { get; init; }
    public required string Description { get; init; }
    public required Money Cost { get; init; }

    private ResolutionAction() { }

    public static ResolutionAction Create(
        ActionType actionType,
        string description,
        Money? cost = null)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new DomainException("Description is required");

        return new ResolutionAction
        {
            Id = Guid.NewGuid().ToString(),
            ActionType = actionType,
            Description = description,
            Cost = cost ?? Money.Zero("HUF")
        };
    }
}
