using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SpaceOS.Collaboration.Application.Adapters;
using SpaceOS.Collaboration.Infrastructure.Kernel;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// B2B-10 F5/2 — the Kernel-backed adapter's error map, measured with a hand-written
/// <see cref="HttpMessageHandler"/> double (no new NuGet, per the issuance).
/// </summary>
/// <remarks>
/// The map IS the contract: 404 → <c>null</c>, 401/403 → rejected (named), timeout and 5xx →
/// unavailable (named), and nothing else folded into "not found". Each case is pinned separately
/// because folding any of them together is the mistake the F5 task doc calls out — an outage
/// impersonating bad user input.
/// </remarks>
public class HttpProjectAdapterTests
{
    private static readonly Guid Epic = Guid.Parse("88888888-8888-8888-8888-888888888888");

    private sealed class StubTokenSource(string? token = "teszt-token") : IOnBehalfOfTokenSource
    {
        public string RequireToken()
            => token ?? throw new OnBehalfOfTokenUnavailableException();
    }

    /// <summary>Answers one canned response and records what was asked.</summary>
    private sealed class CannedHandler(Func<HttpRequestMessage, HttpResponseMessage> answer) : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            return Task.FromResult(answer(request));
        }
    }

    /// <summary>Never answers — the shape of a Kernel that hangs.</summary>
    private sealed class HangingHandler : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            await Task.Delay(Timeout.Infinite, cancellationToken);
            throw new InvalidOperationException("unreachable");
        }
    }

    private static HttpProjectAdapter Adapter(
        HttpMessageHandler handler, IOnBehalfOfTokenSource? tokens = null, int timeoutSeconds = 5)
        => new(
            new HttpClient(handler) { BaseAddress = new Uri("http://kernel.test/") },
            tokens ?? new StubTokenSource(),
            Options.Create(new KernelProjectAdapterOptions
            {
                BaseUrl = "http://kernel.test",
                TimeoutSeconds = timeoutSeconds
            }),
            NullLogger<HttpProjectAdapter>.Instance);

    private static HttpResponseMessage Json(HttpStatusCode status, string body)
        => new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    [Fact]
    public async Task A_known_epic_resolves_and_the_call_carries_the_forwarded_token()
    {
        var handler = new CannedHandler(_ => Json(
            HttpStatusCode.OK,
            $$"""{"id":"{{Epic}}","title":"Ajtógyártás Q3","targetFacilityId":"{{Guid.NewGuid()}}","phase":2,"isDelegated":false}"""));

        var reference = await Adapter(handler).ResolveFlowEpicAsync(Epic);

        Assert.NotNull(reference);
        Assert.Equal(Epic, reference.FlowEpicId);
        Assert.Equal("Ajtógyártás Q3", reference.Title);

        // On-behalf-of on the wire: the caller's own token, as a bearer, on the flow-epic route.
        Assert.Equal("Bearer", handler.LastRequest!.Headers.Authorization?.Scheme);
        Assert.Equal("teszt-token", handler.LastRequest.Headers.Authorization?.Parameter);
        Assert.Equal($"/api/flow-epics/{Epic}", handler.LastRequest.RequestUri!.AbsolutePath);
    }

    [Fact]
    public async Task Not_found_is_null_not_an_exception()
    {
        var handler = new CannedHandler(_ => new HttpResponseMessage(HttpStatusCode.NotFound));

        Assert.Null(await Adapter(handler).ResolveFlowEpicAsync(Epic));
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    public async Task A_kernel_refusing_our_token_is_a_named_trust_fault(HttpStatusCode status)
    {
        var handler = new CannedHandler(_ => new HttpResponseMessage(status));

        var exception = await Assert.ThrowsAsync<ProjectResolutionRejectedException>(() =>
            Adapter(handler).ResolveFlowEpicAsync(Epic));

        Assert.Equal((int)status, exception.StatusCode);
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.BadGateway)]
    [InlineData(HttpStatusCode.BadRequest)]
    public async Task Any_other_kernel_answer_is_unavailable_never_null(HttpStatusCode status)
    {
        // The dangerous fold would be "not 200 → null": an outage would then read as "no such
        // epic" and a create would be refused with advice to fix a perfectly good id.
        var handler = new CannedHandler(_ => new HttpResponseMessage(status));

        await Assert.ThrowsAsync<ProjectResolutionUnavailableException>(() =>
            Adapter(handler).ResolveFlowEpicAsync(Epic));
    }

    [Fact]
    public async Task A_hanging_kernel_hits_the_per_call_budget_and_says_timeout()
    {
        var exception = await Assert.ThrowsAsync<ProjectResolutionUnavailableException>(() =>
            Adapter(new HangingHandler(), timeoutSeconds: 1).ResolveFlowEpicAsync(Epic));

        Assert.Contains("timed out", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task The_callers_own_cancellation_stays_a_cancellation()
    {
        // The budget must not swallow the user's hang-up: cancelling the request is not a Kernel
        // fault and must not be reported as one.
        using var cancelled = new CancellationTokenSource();
        cancelled.CancelAfter(TimeSpan.FromMilliseconds(50));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            Adapter(new HangingHandler(), timeoutSeconds: 30).ResolveFlowEpicAsync(Epic, cancelled.Token));
    }

    [Fact]
    public async Task A_connection_failure_is_unavailable_with_the_cause_attached()
    {
        var handler = new CannedHandler(_ => throw new HttpRequestException("connection refused"));

        var exception = await Assert.ThrowsAsync<ProjectResolutionUnavailableException>(() =>
            Adapter(handler).ResolveFlowEpicAsync(Epic));

        Assert.IsType<HttpRequestException>(exception.InnerException);
    }

    [Theory]
    [InlineData("ez nem json")]
    [InlineData("""{"title":"id nélkül"}""")]
    public async Task A_malformed_kernel_answer_is_unavailable_not_a_crash(string body)
    {
        var handler = new CannedHandler(_ => Json(HttpStatusCode.OK, body));

        await Assert.ThrowsAsync<ProjectResolutionUnavailableException>(() =>
            Adapter(handler).ResolveFlowEpicAsync(Epic));
    }

    [Fact]
    public async Task Without_a_request_token_the_path_fails_loudly_before_any_call_leaves()
    {
        // The root decree in executable form: no user token → no Kernel call, no fallback. The
        // handler records nothing because nothing was sent.
        var handler = new CannedHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));

        await Assert.ThrowsAsync<OnBehalfOfTokenUnavailableException>(() =>
            Adapter(handler, new StubTokenSource(token: null)).ResolveFlowEpicAsync(Epic));

        Assert.Null(handler.LastRequest);
    }

    // ---------------------------------------------------------------------------------------
    // The fail-fast options
    // ---------------------------------------------------------------------------------------

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("nem-url")]
    [InlineData("ftp://kernel.test")]
    public void A_missing_or_broken_base_url_refuses_to_validate(string baseUrl)
    {
        var result = new KernelProjectAdapterOptionsValidator()
            .Validate(null, new KernelProjectAdapterOptions { BaseUrl = baseUrl });

        Assert.True(result.Failed);
    }

    [Fact]
    public void A_non_positive_timeout_refuses_to_validate()
    {
        var result = new KernelProjectAdapterOptionsValidator()
            .Validate(null, new KernelProjectAdapterOptions { BaseUrl = "http://kernel.test", TimeoutSeconds = 0 });

        Assert.True(result.Failed);
    }

    [Fact]
    public void A_proper_configuration_validates()
    {
        var result = new KernelProjectAdapterOptionsValidator()
            .Validate(null, new KernelProjectAdapterOptions { BaseUrl = "https://kernel.internal:5001", TimeoutSeconds = 5 });

        Assert.True(result.Succeeded);
    }
}
