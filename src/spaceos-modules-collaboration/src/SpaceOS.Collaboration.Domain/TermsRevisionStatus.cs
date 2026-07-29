namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Status of an agreement terms revision.
/// </summary>
public enum TermsRevisionStatus
{
    Draft = 0,
    Offered = 1,
    Accepted = 2,
    Rejected = 3,
    Superseded = 4
}
