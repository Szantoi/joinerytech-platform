namespace SpaceOS.Collaboration.Application.Authorization;

/// <summary>
/// Supplies the authenticated caller for the current unit of work (B2B-10 F3).
/// </summary>
/// <remarks>
/// The API host implements this from the resolved tenant (ADR-061: the token's <c>tid</c>, with
/// <c>X-Tenant-Id</c> accepted only when it is inside the token's own tenant list) and the user
/// claim. The application layer only declares what it needs, so a background worker can supply a
/// caller of its own without the layer knowing about HTTP.
/// </remarks>
public interface ICollaborationCallerContext
{
    /// <summary>The caller behind the current request.</summary>
    /// <exception cref="CollaborationCallerUnresolvedException">
    /// No authenticated caller could be resolved. Deliberately an exception rather than
    /// <c>null</c>: the alternative is an authorization check that quietly compares against
    /// <c>Guid.Empty</c> and passes for whoever also sent nothing.
    /// </exception>
    CollaborationCaller Current { get; }
}
