using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// Resolves current subject/tenant authority from the Kernel over a strictly bounded channel.
/// </summary>
/// <remarks>
/// The fixed POST is a read-only resolution operation. Only this operation receives the narrow
/// retry policy below; no generic POST retry handler is registered. The provider never receives
/// or forwards the user's bearer token, never serves an expired cache item and never falls back
/// to token content after an online failure.
/// </remarks>
public sealed class KernelOnlineIdentityAuthorityStateProvider(
    HttpClient httpClient,
    IOptions<KernelOnlineIdentityAuthorityOptions> configuredOptions,
    IKernelOnlineIdentityAuthorityServiceAuthenticator serviceAuthenticator,
    IMemoryCache cache,
    KernelOnlineIdentityAuthorityRuntimeState runtimeState,
    ILogger<KernelOnlineIdentityAuthorityStateProvider> logger)
    : IOnlineIdentityAuthorityStateProvider
{
    private static readonly JsonSerializerOptions RequestJsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly HashSet<string> AllowedAuthenticatedRequestHeaders =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "Accept",
            "Authorization",
            "DPoP",
        };
    private static readonly HashSet<string> AllowedAuthorizationSchemes =
        new(StringComparer.Ordinal) { "Bearer", "DPoP" };
    private static readonly HashSet<Guid> ReservedTenantIds =
    [
        Guid.Empty,
        Guid.Parse("00000000-0000-0000-0000-000000000001"),
        Guid.Parse("00000000-0000-0000-0000-000000000002"),
    ];
    private readonly KernelOnlineIdentityAuthorityOptions _options = configuredOptions.Value;
    private readonly Uri _expectedBaseUri =
        KernelOnlineIdentityAuthorityEndpointPolicy.CreateBaseUri(configuredOptions.Value.BaseUrl!);
    private readonly Uri _expectedResolveUri =
        KernelOnlineIdentityAuthorityEndpointPolicy.CreateResolveUri(configuredOptions.Value.BaseUrl!);

    /// <inheritdoc />
    public async ValueTask<OnlineIdentityAuthorityState?> GetCurrentAsync(
        string subject,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        ValidateScope(subject, tenantId);
        cancellationToken.ThrowIfCancellationRequested();

        var stopwatch = Stopwatch.StartNew();
        var cacheKey = new AuthorityCacheKey(subject, tenantId);
        if (_options.CacheTtlMilliseconds > 0
            && cache.TryGetValue(cacheKey, out OnlineIdentityAuthorityState? cached)
            && cached is not null)
        {
            runtimeState.Record(
                KernelOnlineIdentityAuthorityOutcome.CacheHit,
                stopwatch.Elapsed,
                KernelOnlineIdentityAuthorityDependencyObservation.Neutral);
            return cached;
        }

        // If a previously cached item has expired, a failed online refresh must never recover it.
        cache.Remove(cacheKey);

        using var totalBudget = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        totalBudget.CancelAfter(TimeSpan.FromMilliseconds(_options.TotalTimeoutMilliseconds));

        try
        {
            var result = await ExecuteWithinBudgetAsync(
                subject,
                tenantId,
                totalBudget.Token,
                cancellationToken,
                stopwatch).ConfigureAwait(false);

            if (result is not null && _options.CacheTtlMilliseconds > 0)
            {
                cache.Set(
                    cacheKey,
                    result,
                    TimeSpan.FromMilliseconds(_options.CacheTtlMilliseconds));
            }

            var outcome = result is null
                ? KernelOnlineIdentityAuthorityOutcome.NotFound
                : KernelOnlineIdentityAuthorityOutcome.Success;
            runtimeState.Record(
                outcome,
                stopwatch.Elapsed,
                KernelOnlineIdentityAuthorityDependencyObservation.Available);
            logger.LogDebug(
                "Kernel online identity authority completed with {Outcome} in {ElapsedMilliseconds} ms.",
                KernelOnlineIdentityAuthorityRuntimeState.OutcomeName(outcome),
                stopwatch.Elapsed.TotalMilliseconds);
            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            runtimeState.Record(
                KernelOnlineIdentityAuthorityOutcome.CallerCancelled,
                stopwatch.Elapsed,
                KernelOnlineIdentityAuthorityDependencyObservation.Neutral);
            throw;
        }
        catch (KernelOnlineIdentityAuthorityException exception)
        {
            runtimeState.Record(
                exception.Outcome,
                stopwatch.Elapsed,
                KernelOnlineIdentityAuthorityDependencyObservation.Unavailable);
            logger.LogWarning(
                "Kernel online identity authority failed with {Outcome} after {ElapsedMilliseconds} ms.",
                KernelOnlineIdentityAuthorityRuntimeState.OutcomeName(exception.Outcome),
                stopwatch.Elapsed.TotalMilliseconds);
            throw;
        }
    }

    private async Task<OnlineIdentityAuthorityState?> ExecuteWithinBudgetAsync(
        string subject,
        Guid tenantId,
        CancellationToken totalBudget,
        CancellationToken callerCancellation,
        Stopwatch stopwatch)
    {
        for (var attempt = 1; attempt <= _options.MaxAttempts; attempt++)
        {
            ThrowIfTotalBudgetExpired(totalBudget, callerCancellation, stopwatch);

            using var request = CreateRequest(
                subject,
                tenantId,
                _expectedResolveUri,
                out var expectedPayload);
            using var expectedContent = request.Content!;
            try
            {
                AttestTypedClientConfiguration();
                var authenticationBudget = RemainingBudgetOrThrow(
                    totalBudget,
                    callerCancellation,
                    stopwatch);
                // Invoke on a worker as well as applying WaitAsync: even a broken adapter that
                // blocks before returning its ValueTask cannot escape the end-to-end budget.
                var authenticationTask = Task.Run(
                    async () => await serviceAuthenticator.AuthenticateAsync(
                        request,
                        _options.ServiceAuthReference!,
                        totalBudget).ConfigureAwait(false),
                    CancellationToken.None);
                ObserveAuthenticationFault(authenticationTask);
                await authenticationTask.WaitAsync(authenticationBudget, callerCancellation).ConfigureAwait(false);
                await AttestAuthenticatedRequestAsync(
                    request,
                    expectedContent,
                    expectedPayload,
                    _expectedResolveUri,
                    totalBudget).ConfigureAwait(false);
                AttestTypedClientConfiguration();
                KernelOnlineIdentityAuthorityRequestAttestation.Stamp(
                    request,
                    _expectedResolveUri,
                    expectedContent);
            }
            catch (OperationCanceledException) when (callerCancellation.IsCancellationRequested)
            {
                throw;
            }
            catch (TimeoutException exception)
            {
                throw TimeoutFailure("The service-authentication step exceeded the total lookup budget.", exception);
            }
            catch (OperationCanceledException exception) when (totalBudget.IsCancellationRequested)
            {
                throw TimeoutFailure("The service-authentication step exceeded the total lookup budget.", exception);
            }
            catch (Exception exception)
            {
                throw new KernelOnlineIdentityAuthorityException(
                    KernelOnlineIdentityAuthorityOutcome.ServiceAuthenticationError,
                    "The configured service-authentication adapter or its request attestation failed closed.",
                    exception);
            }

            var remaining = RemainingBudgetOrThrow(
                totalBudget,
                callerCancellation,
                stopwatch);

            using var attemptBudget = CancellationTokenSource.CreateLinkedTokenSource(totalBudget);
            attemptBudget.CancelAfter(
                remaining < TimeSpan.FromMilliseconds(_options.AttemptTimeoutMilliseconds)
                    ? remaining
                    : TimeSpan.FromMilliseconds(_options.AttemptTimeoutMilliseconds));

            HttpResponseMessage response;
            try
            {
                response = await httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    attemptBudget.Token).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (callerCancellation.IsCancellationRequested)
            {
                throw;
            }
            catch (OperationCanceledException exception)
            {
                throw TimeoutFailure("The Kernel authority lookup timed out.", exception);
            }
            catch (HttpRequestException exception)
            {
                if (exception.HttpRequestError == HttpRequestError.ConnectionError
                    && attempt < _options.MaxAttempts
                    && !totalBudget.IsCancellationRequested)
                {
                    await DelayBeforeRetryAsync(totalBudget, callerCancellation).ConfigureAwait(false);
                    continue;
                }

                throw new KernelOnlineIdentityAuthorityException(
                    KernelOnlineIdentityAuthorityOutcome.TransportError,
                    "The Kernel authority transport failed.",
                    exception);
            }

            using (response)
            {
                if (response.StatusCode == HttpStatusCode.OK)
                {
                    try
                    {
                        var body = await ReadBoundedJsonBodyAsync(
                            response.Content,
                            attemptBudget.Token).ConfigureAwait(false);
                        var state = KernelOnlineIdentityAuthorityResponseParser.Parse(
                            body,
                            subject,
                            tenantId);
                        ThrowIfTotalBudgetExpired(totalBudget, callerCancellation, stopwatch);
                        return state;
                    }
                    catch (OperationCanceledException) when (callerCancellation.IsCancellationRequested)
                    {
                        throw;
                    }
                    catch (OperationCanceledException exception)
                    {
                        throw TimeoutFailure("Reading the Kernel authority response timed out.", exception);
                    }
                    catch (HttpRequestException exception)
                    {
                        throw new KernelOnlineIdentityAuthorityException(
                            KernelOnlineIdentityAuthorityOutcome.TransportError,
                            "Reading the Kernel authority response failed.",
                            exception);
                    }
                    catch (IOException exception)
                    {
                        throw new KernelOnlineIdentityAuthorityException(
                            KernelOnlineIdentityAuthorityOutcome.TransportError,
                            "Reading the Kernel authority response failed.",
                            exception);
                    }
                }

                if (response.StatusCode == HttpStatusCode.NotFound)
                    return null;

                if (IsRetryableReadStatus(response.StatusCode)
                    && attempt < _options.MaxAttempts
                    && !totalBudget.IsCancellationRequested)
                {
                    // ResponseHeadersRead leaves the body/connection owned by this response.
                    // Release it before consuming retry budget or opening the second attempt.
                    response.Dispose();
                    await DelayBeforeRetryAsync(totalBudget, callerCancellation).ConfigureAwait(false);
                    continue;
                }

                throw FailureForStatus(response.StatusCode);
            }
        }

        throw new KernelOnlineIdentityAuthorityException(
            KernelOnlineIdentityAuthorityOutcome.TransportError,
            "The Kernel authority lookup exhausted its bounded attempts.");
    }

    private static HttpRequestMessage CreateRequest(
        string subject,
        Guid tenantId,
        Uri expectedResolveUri,
        out byte[] payload)
    {
        var wirePayload = JsonSerializer.SerializeToUtf8Bytes(
            new KernelOnlineIdentityAuthorityRequest(
                subject,
                tenantId.ToString("D", CultureInfo.InvariantCulture)),
            RequestJsonOptions);
        // Keep an independent attestation copy: ByteArrayContent owns the wire array and a
        // hostile adapter must not be able to mutate both the body and its expected value.
        payload = wirePayload.ToArray();
        var request = new HttpRequestMessage(
            HttpMethod.Post,
            expectedResolveUri)
        {
            Content = new ByteArrayContent(wirePayload),
        };
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json")
        {
            CharSet = "utf-8",
        };
        request.Content.Headers.ContentLength = payload.Length;
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return request;
    }

    private static async Task AttestAuthenticatedRequestAsync(
        HttpRequestMessage request,
        HttpContent expectedContent,
        byte[] expectedPayload,
        Uri expectedResolveUri,
        CancellationToken totalBudget)
    {
        if (!string.Equals(request.Method.Method, HttpMethod.Post.Method, StringComparison.Ordinal)
            || request.RequestUri is null
            || !request.RequestUri.IsAbsoluteUri
            || !KernelOnlineIdentityAuthorityEndpointPolicy.IsExactNormalizedUri(
                request.RequestUri,
                expectedResolveUri)
            || request.Version != HttpVersion.Version11
            || request.VersionPolicy != HttpVersionPolicy.RequestVersionOrLower
            || !ReferenceEquals(request.Content, expectedContent)
            || request.Headers.Any(header => !AllowedAuthenticatedRequestHeaders.Contains(header.Key))
            || !HasExactAcceptHeader(request.Headers.Accept)
            || !HasApprovedServiceProof(request.Headers)
            || !HasExactContentHeaders(request.Content.Headers, expectedPayload.Length))
        {
            throw new InvalidOperationException(
                "The service authenticator mutated a source-owned request field or omitted its proof.");
        }

        var authenticatedPayload = await request.Content
            .ReadAsByteArrayAsync(totalBudget)
            .ConfigureAwait(false);
        if (!authenticatedPayload.AsSpan().SequenceEqual(expectedPayload))
        {
            throw new InvalidOperationException(
                "The service authenticator mutated the source-owned request body.");
        }
    }

    private static bool HasExactAcceptHeader(HttpHeaderValueCollection<MediaTypeWithQualityHeaderValue> values)
    {
        if (values.Count != 1)
            return false;

        var value = values.Single();
        return string.Equals(value.MediaType, "application/json", StringComparison.Ordinal)
               && value.Parameters.Count == 0;
    }

    private static bool HasApprovedServiceProof(HttpRequestHeaders headers)
    {
        var authorization = headers.Authorization;
        var hasAuthorization = authorization is not null;
        var validAuthorization = authorization is not null
                                 && AllowedAuthorizationSchemes.Contains(authorization.Scheme)
                                 && IsBoundedProof(authorization.Parameter)
                                 && headers.GetValues("Authorization").Take(2).Count() == 1;

        var hasDpop = headers.TryGetValues("DPoP", out var dpopValues);
        var validDpop = false;
        if (hasDpop)
        {
            var values = dpopValues!.Take(2).ToArray();
            validDpop = values.Length == 1 && IsBoundedProof(values[0]);
        }

        return (hasAuthorization || hasDpop)
               && (!hasAuthorization || validAuthorization)
               && (!hasDpop || validDpop);
    }

    private static bool IsBoundedProof(string? value)
        => !string.IsNullOrEmpty(value)
           && value.Length <= 8192
           && !value.Any(static character => char.IsControl(character) || char.IsWhiteSpace(character));

    private static bool HasExactContentHeaders(HttpContentHeaders headers, int expectedLength)
    {
        var contentType = headers.ContentType;
        var names = headers.Select(static header => header.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return names.SetEquals(["Content-Length", "Content-Type"])
               && headers.ContentLength == expectedLength
               && contentType is not null
               && string.Equals(contentType.MediaType, "application/json", StringComparison.Ordinal)
               && string.Equals(contentType.CharSet, "utf-8", StringComparison.Ordinal)
               && contentType.Parameters.Count == 1;
    }

    private static void ObserveAuthenticationFault(Task authenticationTask)
    {
        _ = authenticationTask.ContinueWith(
            static completed => _ = completed.Exception,
            CancellationToken.None,
            TaskContinuationOptions.OnlyOnFaulted | TaskContinuationOptions.ExecuteSynchronously,
            TaskScheduler.Default);
    }

    private void AttestTypedClientConfiguration()
    {
        if (!KernelOnlineIdentityAuthorityEndpointPolicy.IsExactNormalizedUri(
                httpClient.BaseAddress,
                _expectedBaseUri)
            || httpClient.DefaultRequestHeaders.Any())
        {
            throw new InvalidOperationException(
                "The typed Kernel authority client origin or default headers differ from the source-owned policy.");
        }
    }

    private async Task DelayBeforeRetryAsync(
        CancellationToken totalBudget,
        CancellationToken callerCancellation)
    {
        if (_options.RetryDelayMilliseconds == 0)
            return;

        try
        {
            await Task.Delay(
                TimeSpan.FromMilliseconds(_options.RetryDelayMilliseconds),
                totalBudget).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (callerCancellation.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException exception)
        {
            throw TimeoutFailure("The Kernel authority lookup exhausted its budget before retry.", exception);
        }
    }

    private async Task<ReadOnlyMemory<byte>> ReadBoundedJsonBodyAsync(
        HttpContent content,
        CancellationToken cancellationToken)
    {
        var contentType = content.Headers.ContentType;
        var charset = contentType?.CharSet?.Trim('"');
        if (!string.Equals(
                contentType?.MediaType,
                "application/json",
                StringComparison.OrdinalIgnoreCase)
            || (!string.IsNullOrEmpty(charset)
                && !string.Equals(charset, "utf-8", StringComparison.OrdinalIgnoreCase)))
        {
            throw new KernelOnlineIdentityAuthorityException(
                KernelOnlineIdentityAuthorityOutcome.MalformedResponse,
                "The Kernel authority 200 response must use UTF-8 application/json.");
        }

        if (content.Headers.ContentLength is > 0
            && content.Headers.ContentLength > _options.MaxResponseBytes)
        {
            throw new KernelOnlineIdentityAuthorityException(
                KernelOnlineIdentityAuthorityOutcome.MalformedResponse,
                "The Kernel authority response exceeded the configured body limit.");
        }

        await using var stream = await content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
        var buffer = new byte[_options.MaxResponseBytes + 1];
        var totalRead = 0;
        while (totalRead < buffer.Length)
        {
            var read = await stream.ReadAsync(
                buffer.AsMemory(totalRead, buffer.Length - totalRead),
                cancellationToken).ConfigureAwait(false);
            if (read == 0)
                break;
            totalRead += read;
        }

        if (totalRead > _options.MaxResponseBytes)
        {
            throw new KernelOnlineIdentityAuthorityException(
                KernelOnlineIdentityAuthorityOutcome.MalformedResponse,
                "The Kernel authority response exceeded the configured body limit.");
        }

        return buffer.AsMemory(0, totalRead);
    }

    private static bool IsRetryableReadStatus(HttpStatusCode statusCode)
        => statusCode is HttpStatusCode.RequestTimeout
            or HttpStatusCode.TooManyRequests
            or HttpStatusCode.BadGateway
            or HttpStatusCode.ServiceUnavailable
            or HttpStatusCode.GatewayTimeout;

    private static KernelOnlineIdentityAuthorityException FailureForStatus(HttpStatusCode statusCode)
        => statusCode switch
        {
            HttpStatusCode.Unauthorized => Failure(
                KernelOnlineIdentityAuthorityOutcome.Unauthorized,
                "The Kernel authority rejected the dedicated service identity."),
            HttpStatusCode.Forbidden => Failure(
                KernelOnlineIdentityAuthorityOutcome.Forbidden,
                "The Kernel authority denied the dedicated service identity."),
            HttpStatusCode.Conflict => Failure(
                KernelOnlineIdentityAuthorityOutcome.Conflict,
                "The Kernel authority could not return a consistent state."),
            HttpStatusCode.RequestTimeout => Failure(
                KernelOnlineIdentityAuthorityOutcome.Timeout,
                "The Kernel authority timed out the read-only resolution."),
            HttpStatusCode.TooManyRequests => Failure(
                KernelOnlineIdentityAuthorityOutcome.RateLimited,
                "The Kernel authority rate-limited the lookup."),
            >= HttpStatusCode.InternalServerError => Failure(
                KernelOnlineIdentityAuthorityOutcome.ServerError,
                "The Kernel authority returned a server failure."),
            _ => Failure(
                KernelOnlineIdentityAuthorityOutcome.UnexpectedStatus,
                "The Kernel authority returned an unexpected status."),
        };

    private static KernelOnlineIdentityAuthorityException Failure(
        KernelOnlineIdentityAuthorityOutcome outcome,
        string message)
        => new(outcome, message);

    private static KernelOnlineIdentityAuthorityException TimeoutFailure(
        string message,
        Exception? innerException = null)
        => new(KernelOnlineIdentityAuthorityOutcome.Timeout, message, innerException);

    private void ThrowIfTotalBudgetExpired(
        CancellationToken totalBudget,
        CancellationToken callerCancellation,
        Stopwatch stopwatch)
    {
        callerCancellation.ThrowIfCancellationRequested();
        if (totalBudget.IsCancellationRequested
            || stopwatch.Elapsed >= TimeSpan.FromMilliseconds(_options.TotalTimeoutMilliseconds))
        {
            throw TimeoutFailure("The Kernel authority lookup exhausted its total budget.");
        }
    }

    private TimeSpan RemainingBudgetOrThrow(
        CancellationToken totalBudget,
        CancellationToken callerCancellation,
        Stopwatch stopwatch)
    {
        ThrowIfTotalBudgetExpired(totalBudget, callerCancellation, stopwatch);
        return TimeSpan.FromMilliseconds(_options.TotalTimeoutMilliseconds) - stopwatch.Elapsed;
    }

    private static void ValidateScope(string subject, Guid tenantId)
    {
        ArgumentNullException.ThrowIfNull(subject);
        if (!OnlineIdentityAuthoritySubject.IsCanonical(subject))
        {
            throw new ArgumentException(
                "The authority subject must satisfy the bounded canonical opaque-id grammar.",
                nameof(subject));
        }

        if (ReservedTenantIds.Contains(tenantId))
        {
            throw new ArgumentException(
                "The authority tenant id must be a non-reserved GUID.",
                nameof(tenantId));
        }
    }

    private readonly record struct AuthorityCacheKey(string Subject, Guid TenantId);
}
