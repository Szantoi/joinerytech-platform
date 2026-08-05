namespace SpaceOS.Projects.Application.Idempotency;

/// <summary>What a claim on an idempotency key turned out to be (PROJ-06, the B2B-10 F3/3 contract).</summary>
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
/// Remembers what a keyed request answered, so a retry does not create twice (PROJ-06).
/// </summary>
/// <remarks>
/// The contract is the collaboration module's, deliberately unchanged: a create whose response is
/// lost in transit must be re-askable without minting a second project (and burning a second
/// <c>ProjectCode</c> — the allocator hands out a number before the insert, so a blind retry does
/// not merely duplicate a row, it visibly skips a code). The store must be durable and shared —
/// an in-memory dictionary would silently lose the guarantee on restart or behind a balancer.
/// </remarks>
public interface IIdempotencyStore
{
    /// <summary>Claims the key for this request, or reports what already happened under it.</summary>
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
    /// Releases a claim whose request did not succeed — only successful answers are worth
    /// replaying; a held key would reject the corrected retry of a call that never took effect.
    /// </summary>
    Task AbandonAsync(Guid tenantId, string key, CancellationToken cancellationToken = default);
}
