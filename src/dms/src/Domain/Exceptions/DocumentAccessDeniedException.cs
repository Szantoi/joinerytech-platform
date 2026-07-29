namespace SpaceOS.Modules.DMS.Domain.Exceptions;

/// <summary>
/// The caller may SEE the document but not perform this operation on it.
/// </summary>
/// <remarks>
/// <para>
/// Deliberately distinct from "not found", and the difference is a security decision, not a
/// cosmetic one:
/// </para>
/// <list type="bullet">
///   <item>a caller who may not even VIEW the document gets the ordinary not-found answer, so
///   the response cannot be used to discover which documents exist;</item>
///   <item>a caller who may view it, but not edit, delete or share it, gets this — they already
///   know the document is there, and hiding the reason would only make the UI unexplainable.</item>
/// </list>
/// </remarks>
public sealed class DocumentAccessDeniedException : Exception
{
    /// <summary>Creates the exception with the operation that was refused.</summary>
    /// <param name="operation">Human-readable operation name, for the log and the response.</param>
    public DocumentAccessDeniedException(string operation)
        : base($"A művelet nem engedélyezett ezen a dokumentumon: {operation}.")
    {
        Operation = operation;
    }

    /// <summary>The refused operation.</summary>
    public string Operation { get; }
}
