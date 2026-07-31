namespace SpaceOS.Projects.Domain;

/// <summary>
/// The human-facing business key of a project (e.g. <c>PRJ-2026-014</c>).
/// </summary>
/// <remarks>
/// <para>
/// <b>Why a project has two identities.</b> The internal <see cref="Project.Id"/> is a GUID
/// because that is what other modules already store: the collaboration and scheduling work
/// scopes, and Kontrolling's <c>CostAdjustment.ProjectId</c>. But nobody says a GUID out loud —
/// the portal addresses projects by their code, and so does Kontrolling's REST contract. Both
/// identities are real; collapsing them would break one audience or the other.
/// </para>
/// <para>
/// <b>The format is deliberately NOT validated beyond shape.</b> The portal's mock uses
/// <c>PRJ-2426-001</c> and Kontrolling's documentation <c>PRJ-2026-014</c> — two different year
/// encodings, which is exactly why ADR-072 §7.3 sends the numbering scheme to Gábor rather than
/// letting this type invent one. Until that decision lands, the code is caller-supplied and this
/// type only guarantees it is present, trimmed, bounded and case-stable.
/// </para>
/// </remarks>
public sealed record ProjectCode
{
    /// <summary>Longest accepted code; the column is bounded and so is this.</summary>
    public const int MaxLength = 32;

    private ProjectCode(string value) => Value = value;

    /// <summary>The code as stored and displayed.</summary>
    public string Value { get; }

    /// <summary>Creates a code from caller input.</summary>
    /// <exception cref="ArgumentException">Missing, blank, or longer than <see cref="MaxLength"/>.</exception>
    public static ProjectCode Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException(
                "A project must carry its business code; this is the identifier people and the " +
                "REST contract address it by.", nameof(value));

        var trimmed = value.Trim();

        if (trimmed.Length > MaxLength)
            throw new ArgumentException(
                $"A project code may be at most {MaxLength} characters; got {trimmed.Length}.",
                nameof(value));

        // Upper-cased so that "prj-2026-014" and "PRJ-2026-014" cannot become two projects. The
        // uniqueness index is per tenant and case-sensitive at the database level, so the
        // normalisation has to happen here, where there is exactly one of it.
        return new ProjectCode(trimmed.ToUpperInvariant());
    }

    /// <inheritdoc />
    public override string ToString() => Value;
}
