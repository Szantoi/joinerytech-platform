namespace SpaceOS.Collaboration.Application.Idempotency;

/// <summary>What a claim on an idempotency key turned out to be (B2B-10 F3/3).</summary>
public enum IdempotencyOutcome
{
    /// <summary>The key is ours; the request may run.</summary>
    Started = 0,

    /// <summary>This exact request already completed; its recorded answer is returned again.</summary>
    Replay = 1,

    /// <summary>Another request holds the key right now.</summary>
    InFlight = 2,

    /// <summary>The key was used before for a DIFFERENT request.</summary>
    FingerprintMismatch = 3
}

/// <summary>The outcome, with the recorded response when there is one.</summary>
public sealed record IdempotencyClaim(IdempotencyOutcome Outcome, int? StatusCode = null, string? Body = null);

/// <summary>
/// Remembers what a keyed request answered, so a retry does not act twice (B2B-10 F3/3).
/// </summary>
/// <remarks>
/// <para>
/// The B2B case is exactly the one that needs this. A guest submits a deliverable, the connection
/// drops before the response arrives, and the client retries: without a key the second call either
/// acts again or is refused with a <c>409</c> that is indistinguishable from a genuine conflict.
/// Neither tells the guest whether its work was recorded.
/// </para>
/// <para>
/// <b>The store must be durable and shared, not in-process.</b> A dictionary in memory would make
/// the guarantee evaporate on restart and be silently absent behind a load balancer — a guarantee
/// that holds only on one machine on a good day is worse than none, because clients rely on it.
/// </para>
/// </remarks>
public interface IIdempotencyStore
{
    /// <summary>
    /// Claims the key for this request, or reports what already happened under it.
    /// </summary>
    /// <param name="tenantId">The caller's tenant — keys are scoped to it, never global.</param>
    /// <param name="key">The client's <c>Idempotency-Key</c>.</param>
    /// <param name="fingerprint">Identifies the request, so key reuse can be told from a retry.</param>
    /// <param name="cancellationToken">Cancellation.</param>
    Task<IdempotencyClaim> ClaimAsync(
        Guid tenantId, string key, string fingerprint, CancellationToken cancellationToken = default);

    /// <summary>Records the answer a claimed request produced.</summary>
    Task CompleteAsync(
        Guid tenantId, string key, int statusCode, string body, CancellationToken cancellationToken = default);

    /// <summary>
    /// Releases a claim whose request did not succeed.
    /// </summary>
    /// <remarks>
    /// Only successful answers are worth replaying. A refused request is usually refused for a
    /// reason the client can fix, and holding its key would mean the corrected retry is rejected
    /// as a duplicate of a call that never took effect.
    /// </remarks>
    Task AbandonAsync(Guid tenantId, string key, CancellationToken cancellationToken = default);
}
