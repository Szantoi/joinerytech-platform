using System.Net;
using System.Text;
using SpaceOS.Collaboration.Api;
using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// B2B-10 F3/3 — <c>Idempotency-Key</c> over the real pipeline.
/// </summary>
/// <remarks>
/// The case this is for: a guest submits a deliverable, the connection drops before the answer
/// arrives, and the client retries. Without a key the retry either acts twice or is refused with a
/// <c>409</c> that looks exactly like a genuine conflict — and either way the guest does not learn
/// whether its work was recorded.
/// </remarks>
public class CollaborationIdempotencyTests
{
    private static readonly Guid Host = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Guest = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid HostUser = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid GuestUser = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly DateTimeOffset Now = new(2026, 7, 30, 9, 0, 0, TimeSpan.Zero);

    private static CollaborationAgreement Agreement()
    {
        var agreement = CollaborationAgreement.Create(Host, Guest, "Doorstar pilot", Now.AddDays(-10));
        agreement.AddGrant(CollaborationCapability.WorkPackageExecute, Guid.NewGuid(), Now.AddDays(-9));
        return agreement;
    }

    private static DelegatedWorkPackage OfferedPackage(CollaborationAgreement agreement)
    {
        var package = DelegatedWorkPackage.Create(
            agreement.Id, Host, Guest, "Ajtólap gyártás", "50 db", Now.AddDays(20), Now.AddDays(-2));
        package.Offer(Host, HostUser, Now.AddDays(-1));
        return package;
    }

    private static HttpRequestMessage Request(
        string url, int ifMatch, string key, string? json = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.TryAddWithoutValidation("If-Match", ConditionalRequests.Format(ifMatch));
        request.Headers.TryAddWithoutValidation(CollaborationIdempotencyMiddleware.KeyHeader, key);

        if (json is not null)
        {
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        return request;
    }

    [Fact]
    public async Task A_retried_request_is_answered_from_the_record_and_acts_only_once()
    {
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        var version = package.RowVersion;

        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var url = $"/api/collaboration/v1/work-packages/{package.Id}/accept";

        var first = await host.Client.SendAsync(Request(url, version, "retry-1"));
        var second = await host.Client.SendAsync(Request(url, version, "retry-1"));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        // Without the record the retry would have hit the aggregate with a now-stale If-Match and
        // come back 412 — the client could not tell that its first call had succeeded.
        Assert.True(second.Headers.Contains(CollaborationIdempotencyMiddleware.ReplayHeader));
        Assert.Equal(await first.Content.ReadAsStringAsync(), await second.Content.ReadAsStringAsync());

        Assert.Equal(WorkPackageStatus.Accepted, package.Status);
        Assert.Equal(version + 1, package.RowVersion);
    }

    [Fact]
    public async Task The_same_key_with_a_different_body_is_refused_rather_than_replayed()
    {
        // The hazard the body has to be in the fingerprint for: submitting deliverable A, then B
        // by mistake under the same key. Replaying A's answer would tell the guest that B was
        // recorded when nothing recorded it.
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        package.Accept(Guest, GuestUser, Now.AddHours(-3));
        package.StartProgress(Guest, GuestUser, Now.AddHours(-2));

        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var url = $"/api/collaboration/v1/work-packages/{package.Id}/submit";

        var first = await host.Client.SendAsync(
            Request(url, package.RowVersion, "submit-1", """{"deliverableRef":"DMS:A"}"""));
        var second = await host.Client.SendAsync(
            Request(url, package.RowVersion, "submit-1", """{"deliverableRef":"DMS:B"}"""));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, second.StatusCode);
        Assert.Equal("DMS:A", package.DeliverableRef);
    }

    [Fact]
    public async Task A_key_that_is_still_being_processed_is_a_409()
    {
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        var store = new InMemoryIdempotencyStore();

        await using var host = await CollaborationEndpointTestHost.StartAsync(
            agreement, package, idempotencyStore: store);
        host.As(Guest, GuestUser);

        store.MarkInFlight(Guest, "busy-1", "whatever");

        var response = await host.Client.SendAsync(
            Request($"/api/collaboration/v1/work-packages/{package.Id}/accept", package.RowVersion, "busy-1"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(WorkPackageStatus.Offered, package.Status);
    }

    [Fact]
    public async Task A_refused_request_does_not_hold_its_key()
    {
        // The first attempt is refused for something the client can fix (a stale version). If the
        // key stayed claimed, the corrected retry would be rejected as a duplicate of a call that
        // never took effect.
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        var store = new InMemoryIdempotencyStore();

        await using var host = await CollaborationEndpointTestHost.StartAsync(
            agreement, package, idempotencyStore: store);
        host.As(Guest, GuestUser);

        var url = $"/api/collaboration/v1/work-packages/{package.Id}/accept";

        var stale = await host.Client.SendAsync(Request(url, package.RowVersion - 1, "fixable-1"));
        Assert.Equal(HttpStatusCode.PreconditionFailed, stale.StatusCode);
        Assert.Equal(0, store.Count);

        var corrected = await host.Client.SendAsync(Request(url, package.RowVersion, "fixable-1"));
        Assert.Equal(HttpStatusCode.OK, corrected.StatusCode);
        Assert.Equal(WorkPackageStatus.Accepted, package.Status);
    }

    [Fact]
    public async Task A_refusal_that_arrives_as_a_status_rather_than_an_exception_also_frees_the_key()
    {
        // The sibling of the test above, and the one it does NOT cover: a 412 travels as an
        // exception, so the middleware's catch is what releases the key there. A response that is
        // simply not 2xx — an unmatched route under the module prefix — never throws, and the
        // release has to happen on the ordinary path too. Without this, that branch had no
        // measurement at all: a mutation replacing it with "record it anyway" stayed green.
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        var store = new InMemoryIdempotencyStore();

        await using var host = await CollaborationEndpointTestHost.StartAsync(
            agreement, package, idempotencyStore: store);
        host.As(Guest, GuestUser);

        var request = new HttpRequestMessage(
            HttpMethod.Post, "/api/collaboration/v1/work-packages/does-not-exist/accept");
        request.Headers.TryAddWithoutValidation(
            CollaborationIdempotencyMiddleware.KeyHeader, "unmatched-1");

        var response = await host.Client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(0, store.Count);
    }

    [Fact]
    public async Task Keys_belong_to_the_tenant_that_sent_them()
    {
        // The host reusing the guest's key must not be handed the guest's recorded answer.
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        var store = new InMemoryIdempotencyStore();

        await using var host = await CollaborationEndpointTestHost.StartAsync(
            agreement, package, idempotencyStore: store);

        host.As(Guest, GuestUser);
        var accepted = await host.Client.SendAsync(
            Request($"/api/collaboration/v1/work-packages/{package.Id}/accept", package.RowVersion, "shared-key"));
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);

        host.As(Host, HostUser);
        var hostSide = await host.Client.SendAsync(
            Request($"/api/collaboration/v1/work-packages/{package.Id}/cancel", package.RowVersion, "shared-key",
                """{"reason":"maskepp alakult"}"""));

        Assert.False(hostSide.Headers.Contains(CollaborationIdempotencyMiddleware.ReplayHeader));
        Assert.Equal(WorkPackageStatus.Cancelled, package.Status);
    }

    [Fact]
    public async Task An_oversized_key_is_refused_before_anything_is_claimed()
    {
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        var store = new InMemoryIdempotencyStore();

        await using var host = await CollaborationEndpointTestHost.StartAsync(
            agreement, package, idempotencyStore: store);
        host.As(Guest, GuestUser);

        var response = await host.Client.SendAsync(Request(
            $"/api/collaboration/v1/work-packages/{package.Id}/accept",
            package.RowVersion,
            new string('k', CollaborationIdempotencyMiddleware.MaxKeyLength + 1)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, store.Count);
        Assert.Equal(WorkPackageStatus.Offered, package.Status);
    }

    [Fact]
    public async Task Without_a_key_nothing_is_recorded_and_nothing_changes()
    {
        // The header is opt-in: a client that does not send one gets the plain behaviour, and the
        // store stays empty rather than filling up with rows nobody asked for.
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        var store = new InMemoryIdempotencyStore();

        await using var host = await CollaborationEndpointTestHost.StartAsync(
            agreement, package, idempotencyStore: store);
        host.As(Guest, GuestUser);

        var request = new HttpRequestMessage(
            HttpMethod.Post, $"/api/collaboration/v1/work-packages/{package.Id}/accept");
        request.Headers.TryAddWithoutValidation("If-Match", ConditionalRequests.Format(package.RowVersion));

        var response = await host.Client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, store.Count);
    }
}
