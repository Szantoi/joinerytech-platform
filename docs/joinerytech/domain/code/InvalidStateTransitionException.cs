namespace JoineryTech.CRM.Domain.Exceptions;

using JoineryTech.CRM.Domain.Enums;

/// <summary>
/// Exception thrown when FSM state transition is invalid
/// </summary>
public class InvalidStateTransitionException : DomainException
{
    public string FromState { get; }
    public string ToState { get; }

    public InvalidStateTransitionException(LeadStatus from, LeadStatus to)
        : base($"Invalid Lead state transition: {from} → {to}")
    {
        FromState = from.ToString();
        ToState = to.ToString();
    }

    public InvalidStateTransitionException(OpportunityStatus from, OpportunityStatus to)
        : base($"Invalid Opportunity state transition: {from} → {to}")
    {
        FromState = from.ToString();
        ToState = to.ToString();
    }
}

/// <summary>
/// Base domain exception
/// </summary>
public abstract class DomainException : Exception
{
    protected DomainException(string message) : base(message) { }
    protected DomainException(string message, Exception innerException) : base(message, innerException) { }
}
