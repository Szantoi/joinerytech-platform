using System.Diagnostics;
using System.Net;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Auth;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

public sealed partial class KernelOnlineIdentityAuthorityStateProviderTests
{
    [Theory]
    [InlineData(StatusCodes.Status401Unauthorized, KernelOnlineIdentityAuthorityOutcome.Unauthorized)]
    [InlineData(StatusCodes.Status403Forbidden, KernelOnlineIdentityAuthorityOutcome.Forbidden)]
    [InlineData(StatusCodes.Status409Conflict, KernelOnlineIdentityAuthorityOutcome.Conflict)]
    [InlineData(StatusCodes.Status500InternalServerError, KernelOnlineIdentityAuthorityOutcome.ServerError)]
    [InlineData(StatusCodes.Status418ImATeapot, KernelOnlineIdentityAuthorityOutcome.UnexpectedStatus)]
    public async Task Non_retryable_statuses_fail_once(
        int statusCode,
        KernelOnlineIdentityAuthorityOutcome expectedOutcome)
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(context =>
        {
            Interlocked.Increment(ref attempts);
            context.Response.StatusCode = statusCode;
            return Task.CompletedTask;
        });

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(expectedOutcome, exception.Outcome);
        Assert.Equal(1, attempts);
    }

    [Theory]
    [InlineData(StatusCodes.Status408RequestTimeout)]
    [InlineData(StatusCodes.Status429TooManyRequests)]
    [InlineData(StatusCodes.Status502BadGateway)]
    [InlineData(StatusCodes.Status503ServiceUnavailable)]
    [InlineData(StatusCodes.Status504GatewayTimeout)]
    public async Task Classified_read_failures_retry_once_then_succeed(int firstStatus)
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
        {
            if (Interlocked.Increment(ref attempts) == 1)
            {
                context.Response.StatusCode = firstStatus;
                return;
            }

            await KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(
                context,
                KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA))
                .ConfigureAwait(false);
        });

        var state = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);

        Assert.NotNull(state);
        Assert.Equal(2, attempts);
    }

    [Fact]
    public async Task Only_connection_classified_transport_failure_retries_once_then_succeeds()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(
            static context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                return Task.CompletedTask;
            },
            primaryHandlerFactory: () => new DelegateHttpMessageHandler((_, _) =>
            {
                if (Interlocked.Increment(ref attempts) == 1)
                {
                    throw new HttpRequestException(
                        HttpRequestError.ConnectionError,
                        "synthetic connection failure",
                        null,
                        null);
                }

                return Task.FromResult(JsonResponse(
                    KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA)));
            }));

        var state = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);

        Assert.NotNull(state);
        Assert.Equal(2, attempts);
    }

    [Theory]
    [InlineData(HttpRequestError.Unknown)]
    [InlineData(HttpRequestError.NameResolutionError)]
    [InlineData(HttpRequestError.SecureConnectionError)]
    [InlineData(HttpRequestError.InvalidResponse)]
    [InlineData(HttpRequestError.HttpProtocolError)]
    [InlineData(HttpRequestError.ResponseEnded)]
    public async Task Non_connection_transport_failures_never_retry(HttpRequestError requestError)
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(
            static context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                return Task.CompletedTask;
            },
            primaryHandlerFactory: () => new DelegateHttpMessageHandler((_, _) =>
            {
                Interlocked.Increment(ref attempts);
                throw new HttpRequestException(
                    requestError,
                    "synthetic non-connection transport failure",
                    null,
                    null);
            }));

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.TransportError, exception.Outcome);
        Assert.Equal(1, attempts);
    }

    [Fact]
    public async Task Set_cookie_from_a_retryable_response_is_never_replayed_as_a_cookie()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
        {
            Assert.False(context.Request.Headers.ContainsKey("Cookie"));
            if (Interlocked.Increment(ref attempts) == 1)
            {
                context.Response.Headers.Append("Set-Cookie", "kernel-affinity=untrusted; Path=/");
                context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                return;
            }

            await KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(
                context,
                KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA))
                .ConfigureAwait(false);
        });

        var state = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);

        Assert.NotNull(state);
        Assert.Equal(2, attempts);
    }

    [Theory]
    [InlineData(StatusCodes.Status408RequestTimeout, KernelOnlineIdentityAuthorityOutcome.Timeout)]
    [InlineData(StatusCodes.Status429TooManyRequests, KernelOnlineIdentityAuthorityOutcome.RateLimited)]
    [InlineData(StatusCodes.Status503ServiceUnavailable, KernelOnlineIdentityAuthorityOutcome.ServerError)]
    public async Task Classified_read_failure_stops_after_two_attempts(
        int statusCode,
        KernelOnlineIdentityAuthorityOutcome expectedOutcome)
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(context =>
        {
            Interlocked.Increment(ref attempts);
            context.Response.StatusCode = statusCode;
            return Task.CompletedTask;
        });

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(expectedOutcome, exception.Outcome);
        Assert.Equal(2, attempts);
    }

    [Fact]
    public async Task Successful_status_requires_utf8_application_json()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
        {
            Interlocked.Increment(ref attempts);
            context.Response.StatusCode = StatusCodes.Status200OK;
            context.Response.ContentType = "application/json; charset=utf-16";
            await context.Response.WriteAsync(
                KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA),
                context.RequestAborted).ConfigureAwait(false);
        });

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.MalformedResponse, exception.Outcome);
        Assert.Equal(1, attempts);
    }

    [Fact]
    public async Task Declared_content_length_over_the_limit_is_rejected_without_read_or_retry()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(
            static context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                return Task.CompletedTask;
            },
            new Dictionary<string, string?>
            {
                [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:MaxResponseBytes"] = "4096",
            },
            primaryHandlerFactory: () => new DelegateHttpMessageHandler((_, _) =>
            {
                Interlocked.Increment(ref attempts);
                var response = JsonResponse("{}");
                response.Content.Headers.ContentLength = 4097;
                return Task.FromResult(response);
            }));

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.MalformedResponse, exception.Outcome);
        Assert.Equal(1, attempts);
    }

    [Fact]
    public async Task Chunked_body_is_read_only_through_max_plus_one_and_never_retried()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(
            static context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                return Task.CompletedTask;
            },
            new Dictionary<string, string?>
            {
                [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:MaxResponseBytes"] = "4096",
            },
            primaryHandlerFactory: () => new DelegateHttpMessageHandler((_, _) =>
            {
                Interlocked.Increment(ref attempts);
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new UnknownLengthContent(new byte[4097]),
                };
                response.Headers.TransferEncodingChunked = true;
                return Task.FromResult(response);
            }));

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.MalformedResponse, exception.Outcome);
        Assert.Equal(1, attempts);
    }

    [Theory]
    [InlineData(false, KernelOnlineIdentityAuthorityOutcome.TransportError)]
    [InlineData(true, KernelOnlineIdentityAuthorityOutcome.Timeout)]
    public async Task Response_body_read_failures_never_retry(
        bool cancellation,
        KernelOnlineIdentityAuthorityOutcome expectedOutcome)
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(
            static context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                return Task.CompletedTask;
            },
            primaryHandlerFactory: () => new DelegateHttpMessageHandler((_, _) =>
            {
                Interlocked.Increment(ref attempts);
                Exception failure = cancellation
                    ? new OperationCanceledException("synthetic body-read cancellation")
                    : new HttpRequestException(
                        HttpRequestError.ConnectionError,
                        "synthetic body-read transport failure",
                        null,
                        null);
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ThrowingReadContent(failure),
                });
            }));

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(expectedOutcome, exception.Outcome);
        Assert.Equal(1, attempts);
    }

    [Fact]
    public async Task Attempt_timeout_is_bounded_and_never_retried()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
        {
            Interlocked.Increment(ref attempts);
            await Task.Delay(TimeSpan.FromSeconds(5), context.RequestAborted).ConfigureAwait(false);
        }, new Dictionary<string, string?>
        {
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:TotalTimeoutMilliseconds"] = "100",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:AttemptTimeoutMilliseconds"] = "35",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:RetryDelayMilliseconds"] = "5",
        });
        var stopwatch = Stopwatch.StartNew();

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        stopwatch.Stop();
        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.Timeout, exception.Outcome);
        Assert.Equal(1, attempts);
        Assert.True(stopwatch.Elapsed < TimeSpan.FromMilliseconds(500), stopwatch.Elapsed.ToString());
    }

    [Fact]
    public async Task Caller_cancellation_is_not_reclassified_as_dependency_timeout()
    {
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
            await Task.Delay(TimeSpan.FromSeconds(5), context.RequestAborted).ConfigureAwait(false),
            new Dictionary<string, string?>
            {
                [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:MaxAttempts"] = "1",
                [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:AttemptTimeoutMilliseconds"] = "400",
            });
        using var cancellation = new CancellationTokenSource(TimeSpan.FromMilliseconds(20));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, cancellation.Token));

        var snapshot = harness.Services
            .GetRequiredService<IKernelOnlineIdentityAuthorityObservability>()
            .GetSnapshot();
        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.CallerCancelled, snapshot.LastOutcome);
        Assert.Equal(0, snapshot.ConsecutiveDependencyFailures);
    }

    private static HttpResponseMessage JsonResponse(string json)
        => new(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };

    private sealed class DelegateHttpMessageHandler(
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler)
        : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
            => handler(request, cancellationToken);
    }

    private sealed class UnknownLengthContent : HttpContent
    {
        private readonly byte[] _body;

        public UnknownLengthContent(byte[] body)
        {
            _body = body;
            Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json")
            {
                CharSet = "utf-8",
            };
        }

        protected override async Task SerializeToStreamAsync(
            Stream stream,
            TransportContext? context)
            => await stream.WriteAsync(_body).ConfigureAwait(false);

        protected override bool TryComputeLength(out long length)
        {
            length = 0;
            return false;
        }

        protected override Task<Stream> CreateContentReadStreamAsync()
            => Task.FromResult<Stream>(new MemoryStream(_body, writable: false));

        protected override Task<Stream> CreateContentReadStreamAsync(CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return CreateContentReadStreamAsync();
        }
    }

    private sealed class ThrowingReadContent : HttpContent
    {
        private readonly Exception _failure;

        public ThrowingReadContent(Exception failure)
        {
            _failure = failure;
            Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json")
            {
                CharSet = "utf-8",
            };
        }

        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context)
            => Task.FromException(_failure);

        protected override bool TryComputeLength(out long length)
        {
            length = 0;
            return false;
        }

        protected override Task<Stream> CreateContentReadStreamAsync()
            => Task.FromResult<Stream>(new ThrowingReadStream(_failure));

        protected override Task<Stream> CreateContentReadStreamAsync(CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return CreateContentReadStreamAsync();
        }
    }

    private sealed class ThrowingReadStream(Exception failure) : Stream
    {
        public override bool CanRead => true;

        public override bool CanSeek => false;

        public override bool CanWrite => false;

        public override long Length => throw new NotSupportedException();

        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override void Flush()
        {
        }

        public override int Read(byte[] buffer, int offset, int count) => throw failure;

        public override ValueTask<int> ReadAsync(
            Memory<byte> buffer,
            CancellationToken cancellationToken = default)
            => ValueTask.FromException<int>(failure);

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
