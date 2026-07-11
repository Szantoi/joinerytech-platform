namespace SpaceOS.Modules.QA.Domain.StrongIds;

/// <summary>
/// Strongly-typed ID for QACheckpoint aggregate
/// </summary>
public record QACheckpointId(Guid Value)
{
    public static QACheckpointId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
