namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Status of a B2B participant grant.
/// </summary>
public enum ParticipantGrantStatus
{
    Active = 0,
    Revoked = 1,
    Expired = 2
}
