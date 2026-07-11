using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Domain.ValueObjects;

/// <summary>
/// Failure note value object (describes a specific failure found during inspection)
/// </summary>
public record FailureNote
{
    public required string Id { get; init; }
    public required FailureType FailureType { get; init; }
    public required string Description { get; init; }
    public string? PhotoUrl { get; init; }

    private FailureNote() { }

    public static FailureNote Create(
        FailureType failureType,
        string description,
        string? photoUrl = null)
    {
        if (string.IsNullOrWhiteSpace(description) || description.Length < 10)
            throw new DomainException("Description must be at least 10 characters");

        return new FailureNote
        {
            Id = Guid.NewGuid().ToString(),
            FailureType = failureType,
            Description = description,
            PhotoUrl = photoUrl
        };
    }
}
