using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Application.Projects;

/// <summary>
/// Hands out the next <see cref="ProjectCode"/> for the calling tenant.
/// </summary>
/// <remarks>
/// <para>
/// <b>This port has no production implementation yet, on purpose.</b> ADR-072 §7.3 — the code's
/// FORMAT and whether it is unique per tenant or globally — is an open Gábor decision, and the
/// task brief bans burning a format in. A host composed today therefore fails at the first
/// resolution rather than silently inventing <c>PRJ-2026-001</c>; that is the same fail-loud
/// stance <c>IOnBehalfOfTokenSource</c> takes in the collaboration module, and it is the honest
/// shape for "decided later" as opposed to "decided quietly by whoever wrote the default".
/// </para>
/// <para>
/// <b>Why the port exists now, before the decision.</b> Gábor's §7.2 answer (2026-08-03) made
/// <b>two</b> independent birth paths legal — a CRM order and a standalone create. Two callers
/// supplying their own codes is not a hypothetical risk: it is the state we already measured, with
/// the portal writing <c>PRJ-2426-001</c> and Kontrolling <c>PRJ-2026-014</c> for the same concept.
/// Whatever the format turns out to be, the minting has to happen on <i>this</i> side of the
/// boundary, so the seam belongs in the design now rather than after the first caller ships.
/// </para>
/// <para>
/// The interface deliberately says nothing about how a code is derived — no year, no counter, no
/// prefix. Those are exactly the choices that are not mine to make.
/// </para>
/// </remarks>
public interface IProjectCodeAllocator
{
    /// <summary>Allocates the next unused code for the calling tenant.</summary>
    /// <param name="cancellationToken">Cancellation.</param>
    /// <returns>A code no project of this tenant carries yet.</returns>
    Task<ProjectCode> AllocateAsync(CancellationToken cancellationToken = default);
}
