namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Bilateral agreement status FSM states.
/// </summary>
public enum AgreementStatus
{
    Draft = 0,
    Proposed = 1,
    Accepted = 2,
    Rejected = 3,
    Cancelled = 4,
    Superseded = 5
}
