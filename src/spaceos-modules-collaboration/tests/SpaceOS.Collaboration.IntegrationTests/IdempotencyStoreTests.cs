using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using SpaceOS.Collaboration.Application.Idempotency;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.RlsFixtures;
using Xunit;

namespace SpaceOS.Collaboration.IntegrationTests;

/// <summary>
/// B2B-10 F3/3 — the durable idempotency store, against a real PostgreSQL.
/// </summary>
/// <remarks>
/// The endpoint tests measure the middleware over an in-memory store; that can show the HTTP
/// behaviour and nothing else. The three properties clients actually rely on — the key survives a
/// process, two simultaneous retries do not both get through, and one tenant's keys are invisible
/// to another — live in the table, its unique index and its RLS policy. Only this suite can see them.
/// </remarks>
public sealed class IdempotencyStoreTests : IAsyncLifetime
{
    private const string Schema = "public";

    private readonly NonSuperuserRlsFixture _fixture = new("collaboration_idempotency");
    private readonly Guid _tenant = Guid.NewGuid();
    private readonly Guid _otherTenant = Guid.NewGuid();

    private sealed class MovableClock(DateTimeOffset start) : TimeProvider
    {
        private DateTimeOffset _now = start;

        public override DateTimeOffset GetUtcNow() => _now;

        public void Advance(TimeSpan by) => _now += by;
    }

    private DbContextOptions<CollaborationDbContext> AdminOptions =>
        new DbContextOptionsBuilder<CollaborationDbContext>()
            .UseNpgsql(_fixture.AdminConnectionString)
            .Options;

    public async Task InitializeAsync()
    {
        await _fixture.StartAsync();

        await using var db = new CollaborationDbContext(AdminOptions);
        await db.Database.MigrateAsync();

        await _fixture.CreateApplicationRoleAsync(Schema);
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    private EfIdempotencyStore Store(CollaborationDbContext db, TimeProvider? clock = null)
        => new(db, clock ?? TimeProvider.System, NullLogger<EfIdempotencyStore>.Instance);

    [Fact]
    public async Task A_claim_survives_the_context_that_made_it()
    {
        // The point of a table rather than a dictionary: a different context — in production, a
        // different process — sees the same claim.
        await using (var writer = new CollaborationDbContext(AdminOptions))
        {
            var first = await Store(writer).ClaimAsync(_tenant, "k-survives", "fp-1");
            Assert.Equal(IdempotencyOutcome.Started, first.Outcome);
            await Store(writer).CompleteAsync(_tenant, "k-survives", 200, """{"ok":true}""");
        }

        await using var reader = new CollaborationDbContext(AdminOptions);
        var replay = await Store(reader).ClaimAsync(_tenant, "k-survives", "fp-1");

        Assert.Equal(IdempotencyOutcome.Replay, replay.Outcome);
        Assert.Equal(200, replay.StatusCode);
        Assert.Equal("""{"ok":true}""", replay.Body);
    }

    [Fact]
    public async Task The_second_of_two_simultaneous_retries_is_told_the_first_is_in_flight()
    {
        // Two contexts, neither aware of the other, exactly as two application instances would be.
        await using var one = new CollaborationDbContext(AdminOptions);
        await using var two = new CollaborationDbContext(AdminOptions);

        var winner = await Store(one).ClaimAsync(_tenant, "k-race", "fp-race");
        var loser = await Store(two).ClaimAsync(_tenant, "k-race", "fp-race");

        Assert.Equal(IdempotencyOutcome.Started, winner.Outcome);
        Assert.Equal(IdempotencyOutcome.InFlight, loser.Outcome);
    }

    [Fact]
    public async Task The_unique_index_is_what_decides_the_race_not_the_read()
    {
        // Both contexts read "nothing there" before either inserts — the window a read-then-write
        // implementation would walk straight through. The index closes it.
        await using var one = new CollaborationDbContext(AdminOptions);
        await using var two = new CollaborationDbContext(AdminOptions);

        Assert.Null(await one.IdempotencyRecords.FirstOrDefaultAsync(r => r.Key == "k-index"));
        Assert.Null(await two.IdempotencyRecords.FirstOrDefaultAsync(r => r.Key == "k-index"));

        one.IdempotencyRecords.Add(new CollaborationIdempotencyRecord
        {
            Id = Guid.NewGuid(), TenantId = _tenant, Key = "k-index",
            Fingerprint = "fp", ClaimedAtUtc = DateTimeOffset.UtcNow
        });
        await one.SaveChangesAsync();

        two.IdempotencyRecords.Add(new CollaborationIdempotencyRecord
        {
            Id = Guid.NewGuid(), TenantId = _tenant, Key = "k-index",
            Fingerprint = "fp", ClaimedAtUtc = DateTimeOffset.UtcNow
        });

        var failure = await Assert.ThrowsAsync<DbUpdateException>(() => two.SaveChangesAsync());
        Assert.Equal(PostgresErrorCodes.UniqueViolation, ((PostgresException)failure.InnerException!).SqlState);
    }

    [Fact]
    public async Task The_same_key_used_for_a_different_request_is_reported_as_reuse()
    {
        await using var db = new CollaborationDbContext(AdminOptions);

        await Store(db).ClaimAsync(_tenant, "k-reuse", "fp-a");
        await Store(db).CompleteAsync(_tenant, "k-reuse", 200, "{}");

        var reuse = await Store(db).ClaimAsync(_tenant, "k-reuse", "fp-b");

        Assert.Equal(IdempotencyOutcome.FingerprintMismatch, reuse.Outcome);
    }

    [Fact]
    public async Task An_abandoned_key_can_be_used_again()
    {
        await using var db = new CollaborationDbContext(AdminOptions);

        await Store(db).ClaimAsync(_tenant, "k-abandon", "fp");
        await Store(db).AbandonAsync(_tenant, "k-abandon");

        var again = await Store(db).ClaimAsync(_tenant, "k-abandon", "fp");

        Assert.Equal(IdempotencyOutcome.Started, again.Outcome);
    }

    [Fact]
    public async Task A_claim_whose_process_died_is_reclaimed_rather_than_blocking_forever()
    {
        var clock = new MovableClock(new DateTimeOffset(2026, 7, 30, 8, 0, 0, TimeSpan.Zero));
        await using var db = new CollaborationDbContext(AdminOptions);

        await Store(db, clock).ClaimAsync(_tenant, "k-stalled", "fp");

        var blocked = await Store(db, clock).ClaimAsync(_tenant, "k-stalled", "fp");
        Assert.Equal(IdempotencyOutcome.InFlight, blocked.Outcome);

        clock.Advance(EfIdempotencyStore.StaleClaimAfter + TimeSpan.FromMinutes(1));

        var reclaimed = await Store(db, clock).ClaimAsync(_tenant, "k-stalled", "fp");
        Assert.Equal(IdempotencyOutcome.Started, reclaimed.Outcome);
    }

    [Fact]
    public async Task One_tenants_key_is_not_the_other_tenants_key()
    {
        await using var db = new CollaborationDbContext(AdminOptions);

        var mine = await Store(db).ClaimAsync(_tenant, "shared-name", "fp");
        var theirs = await Store(db).ClaimAsync(_otherTenant, "shared-name", "fp");

        Assert.Equal(IdempotencyOutcome.Started, mine.Outcome);
        Assert.Equal(IdempotencyOutcome.Started, theirs.Outcome);
    }

    [Fact]
    public async Task The_database_hides_another_tenants_records_even_from_a_raw_query()
    {
        // Not "the LINQ filter excluded it" — the application role, with the session key set to my
        // tenant, asking PostgreSQL directly.
        await using (var seed = new CollaborationDbContext(AdminOptions))
        {
            await Store(seed).ClaimAsync(_otherTenant, "k-hidden", "fp");
        }

        await using var connection = new NpgsqlConnection(_fixture.AppConnectionString());
        await connection.OpenAsync();
        await NonSuperuserRlsFixture.SetTenantAsync(connection, _tenant);

        await using var count = new NpgsqlCommand(
            """SELECT count(*) FROM collaboration_idempotency_records WHERE "Key" = 'k-hidden';""",
            connection);

        var hidden = (long)(await count.ExecuteScalarAsync())!;
        Assert.Equal(0L, hidden);
    }
}
