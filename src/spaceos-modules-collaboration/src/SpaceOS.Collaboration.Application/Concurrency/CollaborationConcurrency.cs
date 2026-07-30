namespace SpaceOS.Collaboration.Application.Concurrency;

/// <summary>
/// A command that may name the aggregate version it expects to act on (B2B-10 F3/3).
/// </summary>
/// <remarks>
/// <para>
/// The expectation is a field on the command rather than ambient request state, for the same
/// reason the actor is: a background job or an orchestrator has to be able to state it, and
/// something read from an <c>HttpContext</c> deep inside a handler is exactly what goes missing
/// when the caller is not a request.
/// </para>
/// <para>
/// <c>null</c> means "no expectation" — the write proceeds and the database's own concurrency
/// token is the last line of defence. That is a weaker guarantee, not a missing one: a lost update
/// still surfaces as <see cref="CollaborationConcurrencyConflictException"/> rather than silently
/// overwriting.
/// </para>
/// </remarks>
public interface IConditionalCommand
{
    /// <summary>The <c>RowVersion</c> the caller believes it read, or <c>null</c>.</summary>
    int? ExpectedRowVersion { get; }
}

/// <summary>
/// The caller named a version other than the current one — mapped to <c>412</c>.
/// </summary>
/// <remarks>
/// Checked AFTER authorization on purpose. Answering "wrong version" to a tenant that has no
/// business with the aggregate would turn the endpoint into a version oracle: a stranger could
/// learn how often somebody else's agreement changes by watching which numbers stop being refused.
/// </remarks>
public sealed class CollaborationPreconditionFailedException(int expected, int actual)
    : Exception($"The resource has moved on: expected version {expected}, current version {actual}.")
{
    /// <summary>What the caller expected.</summary>
    public int Expected { get; } = expected;

    /// <summary>What it actually is — safe to disclose, the caller is a party.</summary>
    public int Actual { get; } = actual;
}

/// <summary>
/// The write lost a race that started after the precondition was checked — mapped to <c>409</c>.
/// </summary>
/// <remarks>
/// Distinct from a <c>412</c> by design. A 412 says "you were working from a stale copy, read it
/// again"; this says "you were current when you started, and somebody committed first". The
/// client's next move is the same, but the two say different things about whose fault it was, and
/// a support conversation needs that difference.
/// </remarks>
public sealed class CollaborationConcurrencyConflictException(string message, Exception? innerException = null)
    : Exception(message, innerException);

/// <summary>The one place a version expectation is compared (B2B-10 F3/3).</summary>
/// <remarks>
/// A three-line check duplicated into two handler bases is a three-line check that will disagree
/// with itself the first time one of them learns about weak ETags.
/// </remarks>
public static class CollaborationPrecondition
{
    /// <summary>Refuses the write when the caller's expectation is out of date.</summary>
    /// <param name="expected">The version the caller named, or <c>null</c> for "no expectation".</param>
    /// <param name="actual">The version the aggregate is at.</param>
    /// <exception cref="CollaborationPreconditionFailedException">They differ.</exception>
    public static void Verify(int? expected, int actual)
    {
        if (expected is { } version && version != actual)
        {
            throw new CollaborationPreconditionFailedException(version, actual);
        }
    }
}
