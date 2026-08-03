using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Projects.Application.Projects;
using SpaceOS.Projects.Application.Tenancy;
using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Infrastructure.Data;

/// <summary>
/// Hands out <c>PRJ-2026-001</c> codes: a four-digit calendar year and a per-tenant sequence that
/// restarts each year (ADR-072 §7.3 — Gábor, 2026-08-03).
/// </summary>
/// <remarks>
/// <para>
/// <b>Why the module allocates instead of the caller.</b> Gábor's §7.2 decision made two
/// independent birth paths legal (a CRM order and a standalone create). Two callers minting their
/// own codes is not hypothetical — it is the state that was measured before this module existed,
/// with the portal writing <c>PRJ-2426-001</c> and Kontrolling <c>PRJ-2026-014</c> for the same
/// concept. One allocator on this side is what keeps the two paths agreeing.
/// </para>
/// <para>
/// <b>The allocation is one atomic statement, not read-then-write.</b> <c>INSERT … ON CONFLICT DO
/// UPDATE … RETURNING</c> increments and reads back under a single row lock, so two concurrent
/// creates in the same tenant and year get different numbers rather than colliding on the unique
/// index. The counter is therefore the authority; the index is the backstop that proves it.
/// </para>
/// <para>
/// <b>⚠ The year is UTC, and that is a limitation rather than a decision.</b> A project created
/// just after midnight local time on 1 January falls in the previous year's sequence when the
/// host runs east of UTC. Fixing it properly needs a per-tenant time zone, which this module does
/// not have and should not invent; if a tenant ever cares, that is a new decision, not a silent
/// default. Nothing breaks in the meantime: the code stays unique either way.
/// </para>
/// <para>
/// <b>Gaps are expected and are not a defect.</b> A create that allocates a number and then fails
/// leaves that number unused. Making the sequence gapless would mean holding a lock across the
/// whole transaction, which trades a cosmetic property for a real contention problem.
/// </para>
/// </remarks>
public sealed class SequentialProjectCodeAllocator(
    ProjectsDbContext dbContext,
    ICurrentTenant currentTenant,
    TimeProvider timeProvider) : IProjectCodeAllocator
{
    /// <summary>The prefix every project code carries.</summary>
    public const string Prefix = "PRJ";

    /// <summary>Sequence numbers are padded to this width; longer ones simply grow.</summary>
    public const int SequenceWidth = 3;

    /// <inheritdoc />
    public async Task<ProjectCode> AllocateAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenant.TenantId;
        var year = timeProvider.GetUtcNow().Year;

        // Returns 1 on the first allocation of the year (the INSERT wins) and previous + 1
        // afterwards (the UPDATE wins). Parameterised: the tenant is a value, never SQL text.
        // ToListAsync, not SingleAsync: SingleAsync composes a LIMIT around the statement, and an
        // INSERT … RETURNING is not composable — EF rejects it outright. Enumerating without
        // composition is what lets the write-and-read-back run as the single statement it must be.
        var sequences = await dbContext.Database
            .SqlQueryRaw<int>(
                // $$ so that {0}/{1} stay literal placeholders for SqlQueryRaw while {{…}}
                // interpolates the schema name at compile time.
                $$"""
                INSERT INTO {{ProjectsDbContext.SchemaName}}."project_code_counters"
                    ("TenantId", "Year", "LastValue")
                VALUES ({0}, {1}, 1)
                ON CONFLICT ("TenantId", "Year")
                DO UPDATE SET "LastValue" = "project_code_counters"."LastValue" + 1
                RETURNING "LastValue" AS "Value"
                """,
                tenantId,
                year)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var sequence = sequences.Single();

        var formatted = string.Create(
            CultureInfo.InvariantCulture,
            $"{Prefix}-{year:0000}-{sequence.ToString(CultureInfo.InvariantCulture).PadLeft(SequenceWidth, '0')}");

        return ProjectCode.Create(formatted);
    }
}
