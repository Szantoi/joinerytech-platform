using System.Diagnostics;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Auth;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

public sealed partial class KernelOnlineIdentityAuthorityStateProviderTests
{
    [Fact]
    public async Task Final_handler_receives_only_the_source_pinned_absolute_target_and_attested_headers()
    {
        var calls = 0;
        var expectedResolveUri = new Uri(
            new Uri(KernelOnlineIdentityAuthorityProtocol.DevelopmentLoopbackBaseUrl, UriKind.Absolute),
            KernelOnlineIdentityAuthorityProtocol.ResolvePath);
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(
            static context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                return Task.CompletedTask;
            },
            primaryHandlerFactory: () => new DelegateHttpMessageHandler((request, _) =>
            {
                Interlocked.Increment(ref calls);
                Assert.Equal(expectedResolveUri, request.RequestUri);
                Assert.True(request.RequestUri?.IsAbsoluteUri);
                Assert.Equal(
                    new[] { "Accept", "Authorization" },
                    request.Headers.Select(static header => header.Key).Order(StringComparer.Ordinal));
                Assert.Equal(
                    new[] { "Content-Length", "Content-Type" },
                    request.Content!.Headers.Select(static header => header.Key).Order(StringComparer.Ordinal));
                return Task.FromResult(JsonResponse(
                    KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA)));
            }));

        var state = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);

        Assert.NotNull(state);
        Assert.Equal(1, calls);
    }

    [Fact]
    public async Task Post_registration_base_address_override_fails_before_any_primary_handler_call()
    {
        var calls = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(
            static context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                return Task.CompletedTask;
            },
            primaryHandlerFactory: () => new DelegateHttpMessageHandler((_, _) =>
            {
                Interlocked.Increment(ref calls);
                return Task.FromResult(JsonResponse(
                    KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA)));
            }),
            postConfigureClient: client =>
                client.BaseAddress = new Uri("https://attacker.invalid/collect/", UriKind.Absolute));

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.ServiceAuthenticationError, exception.Outcome);
        Assert.Equal(0, calls);
    }

    [Theory]
    [InlineData("foreign")]
    [InlineData("authorization")]
    [InlineData("dpop")]
    public async Task Post_registration_default_header_or_proof_override_fails_before_send(string mutation)
    {
        var calls = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(
            static context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                return Task.CompletedTask;
            },
            primaryHandlerFactory: () => new DelegateHttpMessageHandler((_, _) =>
            {
                Interlocked.Increment(ref calls);
                return Task.FromResult(JsonResponse(
                    KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA)));
            }),
            postConfigureClient: client =>
            {
                if (mutation == "authorization")
                {
                    client.DefaultRequestHeaders.Authorization =
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "attacker-proof");
                }
                else
                {
                    client.DefaultRequestHeaders.TryAddWithoutValidation(
                        mutation == "dpop" ? "DPoP" : "X-Attacker-Default",
                        "attacker-value");
                }
            });

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.ServiceAuthenticationError, exception.Outcome);
        Assert.Equal(0, calls);
    }

    [Theory]
    [InlineData("uri")]
    [InlineData("header")]
    [InlineData("body")]
    public async Task Post_registration_delegating_handler_mutation_is_rejected_by_innermost_boundary(
        string mutation)
    {
        var calls = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(
            static context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                return Task.CompletedTask;
            },
            primaryHandlerFactory: () => new DelegateHttpMessageHandler((_, _) =>
            {
                Interlocked.Increment(ref calls);
                return Task.FromResult(JsonResponse(
                    KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA)));
            }),
            postConfigureBuilder: builder => builder.AddHttpMessageHandler(
                () => new PostRegistrationMutatingHandler(mutation)));

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.ServiceAuthenticationError, exception.Outcome);
        Assert.Equal(0, calls);
    }

    [Fact]
    public async Task Post_registration_primary_handler_override_is_replaced_by_rejecting_boundary()
    {
        var trustedCalls = 0;
        var attackerCalls = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(
            static context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                return Task.CompletedTask;
            },
            primaryHandlerFactory: () => new DelegateHttpMessageHandler((_, _) =>
            {
                Interlocked.Increment(ref trustedCalls);
                return Task.FromResult(JsonResponse(
                    KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA)));
            }),
            postConfigureBuilder: builder => builder.ConfigurePrimaryHttpMessageHandler(
                () => new DelegateHttpMessageHandler((_, _) =>
                {
                    Interlocked.Increment(ref attackerCalls);
                    return Task.FromResult(JsonResponse(
                        KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA)));
                })));

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.ServiceAuthenticationError, exception.Outcome);
        Assert.Equal(0, trustedCalls);
        Assert.Equal(0, attackerCalls);
    }

    [Fact]
    public async Task Service_authentication_failure_never_reaches_or_retries_the_Kernel()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create<FailingServiceAuthenticator>(
            context =>
            {
                Interlocked.Increment(ref attempts);
                context.Response.StatusCode = StatusCodes.Status200OK;
                return Task.CompletedTask;
            });

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.ServiceAuthenticationError, exception.Outcome);
        Assert.Equal(0, attempts);
    }

    [Fact]
    public async Task Authenticator_cannot_inject_a_provider_outcome()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create<OutcomeInjectingAuthenticator>(
            context =>
            {
                Interlocked.Increment(ref attempts);
                context.Response.StatusCode = StatusCodes.Status200OK;
                return Task.CompletedTask;
            });

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.ServiceAuthenticationError, exception.Outcome);
        Assert.Equal(0, attempts);
    }

    [Fact]
    public async Task Authenticator_operation_cancellation_without_caller_cancellation_is_normalized()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create<CancelledAuthenticator>(
            context =>
            {
                Interlocked.Increment(ref attempts);
                context.Response.StatusCode = StatusCodes.Status200OK;
                return Task.CompletedTask;
            });

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.ServiceAuthenticationError, exception.Outcome);
        Assert.Equal(0, attempts);
    }

    [Fact]
    public async Task Authenticator_mutation_or_missing_proof_fails_attestation_before_send()
    {
        await AssertAuthenticatorRejectedAsync<MissingProofAuthenticator>();
        await AssertAuthenticatorRejectedAsync<MethodMutatingAuthenticator>();
        await AssertAuthenticatorRejectedAsync<UriMutatingAuthenticator>();
        await AssertAuthenticatorRejectedAsync<HostMutatingAuthenticator>();
        await AssertAuthenticatorRejectedAsync<BodyMutatingAuthenticator>();
        await AssertAuthenticatorRejectedAsync<ContentHeaderMutatingAuthenticator>();
        await AssertAuthenticatorRejectedAsync<AcceptMutatingAuthenticator>();
        await AssertAuthenticatorRejectedAsync<ExtraHeaderMutatingAuthenticator>();
        await AssertAuthenticatorRejectedAsync<InvalidDpopAuthenticator>();
    }

    [Fact]
    public async Task Ignored_authenticator_cancellation_cannot_escape_the_total_budget_or_send()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create<IgnoringCancellationAuthenticator>(
            context =>
            {
                Interlocked.Increment(ref attempts);
                context.Response.StatusCode = StatusCodes.Status200OK;
                return Task.CompletedTask;
            },
            new Dictionary<string, string?>
            {
                [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:TotalTimeoutMilliseconds"] = "50",
                [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:AttemptTimeoutMilliseconds"] = "40",
            });
        var stopwatch = Stopwatch.StartNew();

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        stopwatch.Stop();
        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.Timeout, exception.Outcome);
        Assert.Equal(0, attempts);
        Assert.True(stopwatch.Elapsed < TimeSpan.FromMilliseconds(500), stopwatch.Elapsed.ToString());
    }

    [Fact]
    public async Task Synchronously_blocking_then_faulting_authenticator_is_bounded_and_observed_without_send()
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create<
            SynchronouslyBlockingThenFaultingAuthenticator>(
            context =>
            {
                Interlocked.Increment(ref attempts);
                context.Response.StatusCode = StatusCodes.Status200OK;
                return Task.CompletedTask;
            },
            new Dictionary<string, string?>
            {
                [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:TotalTimeoutMilliseconds"] = "50",
                [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:AttemptTimeoutMilliseconds"] = "40",
            });
        var stopwatch = Stopwatch.StartNew();

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        stopwatch.Stop();
        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.Timeout, exception.Outcome);
        Assert.Equal(0, attempts);
        Assert.True(stopwatch.Elapsed < TimeSpan.FromMilliseconds(500), stopwatch.Elapsed.ToString());

        // Let the source task fault after the provider returned; its observation continuation
        // must consume the exception and it must never revive/send the disposed request.
        await Task.Delay(800);
        Assert.Equal(0, attempts);
    }

    [Theory]
    [InlineData(" operator-42")]
    [InlineData("operator-42 ")]
    [InlineData("operator\t42")]
    [InlineData("operator\u00a042")]
    [InlineData("operator\u200b42")]
    [InlineData("operator\u000142")]
    public async Task Noncanonical_subject_never_reaches_service_authentication_or_the_Kernel(
        string invalidSubject)
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(context =>
        {
            Interlocked.Increment(ref attempts);
            context.Response.StatusCode = StatusCodes.Status200OK;
            return Task.CompletedTask;
        });

        await Assert.ThrowsAsync<ArgumentException>(async () =>
            await harness.Provider.GetCurrentAsync(invalidSubject, TenantA, CancellationToken.None));

        Assert.Equal(0, attempts);
    }

    [Fact]
    public async Task Surrogate_subject_never_reaches_service_authentication_or_the_Kernel()
    {
        var attempts = 0;
        var invalidSubject = string.Concat("operator", new string((char)0xd800, 1), "42");
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(context =>
        {
            Interlocked.Increment(ref attempts);
            context.Response.StatusCode = StatusCodes.Status200OK;
            return Task.CompletedTask;
        });

        await Assert.ThrowsAsync<ArgumentException>(async () =>
            await harness.Provider.GetCurrentAsync(invalidSubject, TenantA, CancellationToken.None));

        Assert.Equal(0, attempts);
    }

    private static async Task AssertAuthenticatorRejectedAsync<TAuthenticator>()
        where TAuthenticator : class, IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create<TAuthenticator>(context =>
        {
            Interlocked.Increment(ref attempts);
            context.Response.StatusCode = StatusCodes.Status200OK;
            return Task.CompletedTask;
        });

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.ServiceAuthenticationError, exception.Outcome);
        Assert.Equal(0, attempts);
    }

    private static void ApplyServiceProof(HttpRequestMessage request)
        => request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer",
            "synthetic-service-proof");

    private sealed class PostRegistrationMutatingHandler(string mutation) : DelegatingHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            switch (mutation)
            {
                case "uri":
                    request.RequestUri = new Uri("https://attacker.invalid/collect", UriKind.Absolute);
                    break;
                case "header":
                    request.Headers.TryAddWithoutValidation("X-Late-Mutation", "attacker-value");
                    break;
                case "body":
                    request.Content = new StringContent("{}", Encoding.UTF8, "application/json");
                    break;
                default:
                    throw new InvalidOperationException("Unknown synthetic request mutation.");
            }

            return base.SendAsync(request, cancellationToken);
        }
    }

    private sealed class MissingProofAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
            => ValueTask.CompletedTask;
    }

    private sealed class MethodMutatingAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
        {
            ApplyServiceProof(request);
            request.Method = HttpMethod.Get;
            return ValueTask.CompletedTask;
        }
    }

    private sealed class UriMutatingAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
        {
            ApplyServiceProof(request);
            request.RequestUri = new Uri("https://attacker.invalid/collect", UriKind.Absolute);
            return ValueTask.CompletedTask;
        }
    }

    private sealed class HostMutatingAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
        {
            ApplyServiceProof(request);
            request.Headers.Host = "attacker.invalid";
            return ValueTask.CompletedTask;
        }
    }

    private sealed class BodyMutatingAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
        {
            ApplyServiceProof(request);
            request.Content = new StringContent("{}", Encoding.UTF8, "application/json");
            return ValueTask.CompletedTask;
        }
    }

    private sealed class ContentHeaderMutatingAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
        {
            ApplyServiceProof(request);
            request.Content!.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/plain");
            return ValueTask.CompletedTask;
        }
    }

    private sealed class AcceptMutatingAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
        {
            ApplyServiceProof(request);
            request.Headers.Accept.Clear();
            return ValueTask.CompletedTask;
        }
    }

    private sealed class ExtraHeaderMutatingAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
        {
            ApplyServiceProof(request);
            request.Headers.TryAddWithoutValidation("Cookie", "attacker=1");
            return ValueTask.CompletedTask;
        }
    }

    private sealed class InvalidDpopAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
        {
            ApplyServiceProof(request);
            request.Headers.TryAddWithoutValidation("DPoP", "invalid proof with spaces");
            return ValueTask.CompletedTask;
        }
    }

    private sealed class IgnoringCancellationAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public async ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
            => await Task.Delay(Timeout.InfiniteTimeSpan).ConfigureAwait(false);
    }

    private sealed class SynchronouslyBlockingThenFaultingAuthenticator
        : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
        {
            Thread.Sleep(750);
            throw new InvalidOperationException("Synthetic late synchronous adapter failure.");
        }
    }

    private sealed class OutcomeInjectingAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
            => throw new KernelOnlineIdentityAuthorityException(
                KernelOnlineIdentityAuthorityOutcome.Success,
                "Synthetic outcome injection.");
    }

    private sealed class CancelledAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
            => throw new OperationCanceledException("Synthetic adapter-owned cancellation.");
    }

    private sealed class FailingServiceAuthenticator : IKernelOnlineIdentityAuthorityServiceAuthenticator
    {
        public ValueTask AuthenticateAsync(
            HttpRequestMessage request,
            string serviceAuthReference,
            CancellationToken cancellationToken)
            => throw new InvalidOperationException("Synthetic credential-custody failure.");
    }
}
