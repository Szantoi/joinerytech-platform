namespace SpaceOS.Collaboration.Domain;

public enum OutboxMessageStatus
{
    Pending = 0,
    Processed = 1,
    Failed = 2,
    DeadLetter = 3
}
