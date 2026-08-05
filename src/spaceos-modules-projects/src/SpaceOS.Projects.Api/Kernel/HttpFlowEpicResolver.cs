using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

namespace SpaceOS.Projects.Api.Kernel;

/// <summary>
/// Resolves flow-epics against the Kernel's <c>GET /api/flow-epics/{id}</c>, on behalf of the
/// caller (PROJ-06; the collaboration module's proven B2B-10 F5/2 adapter, unchanged in shape).
/// </summary>
/// <remarks>
/// <para>
/// <b>On-behalf-of:</b> every call forwards the current request's own bearer token. The F5/0
/// measurement is the reason: the Kernel scopes its rows by the token's <c>tid</c>, and a
/// service identity carries no tenant — forwarding is the only path on which the Kernel's 404
/// keeps meaning "not yours".
/// </para>
/// <para>
/// <b>The error map is the contract:</b> 404 → <c>false</c>; 401/403 →
/// <see cref="EpicResolutionRejectedException"/>; timeout, connection failure, 5xx and a
/// malformed body → <see cref="EpicResolutionUnavailableException"/>. Nothing else is folded
/// into <c>false</c>, so an outage can never impersonate "bad epic id".
/// </para>
/// </remarks>
public sealed class HttpFlowEpicResolver(
    HttpClient httpClient,
    IHttpContextAccessor httpContextAccessor,
    IOptions<ProjectsKernelOptions> options,
    ILogger<HttpFlowEpicResolver> logger) : IFlowEpicResolver
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>The Kernel's flow-epic answer; only the field the existence check needs.</summary>
    private sealed record FlowEpicResponse(Guid Id);

    /// <inheritdoc />
    public async Task<bool> FlowEpicExistsAsync(
        Guid flowEpicId, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/flow-epics/{flowEpicId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", RequireCallerToken());

        // Per-call budget, distinct from the caller's own cancellation: when THIS fires it is the
        // Kernel being slow, and the exception must say so instead of looking like the user gave up.
        using var budget = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        budget.CancelAfter(TimeSpan.FromSeconds(options.Value.TimeoutSeconds));

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(request, budget.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning(
                "Kernel flow-epic resolution for {FlowEpicId} timed out after {TimeoutSeconds}s.",
                flowEpicId, options.Value.TimeoutSeconds);

            throw new EpicResolutionUnavailableException(
                $"timed out after {options.Value.TimeoutSeconds}s");
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(
                exception, "Kernel flow-epic resolution for {FlowEpicId} could not connect.", flowEpicId);

            throw new EpicResolutionUnavailableException("the Kernel could not be reached", exception);
        }

        using (response)
        {
            switch (response.StatusCode)
            {
                case HttpStatusCode.NotFound:
                    // Absent and not-yours are one answer — the Kernel's row filter made that
                    // choice, and it is the same one this module's own reads make.
                    return false;

                case HttpStatusCode.Unauthorized:
                case HttpStatusCode.Forbidden:
                    logger.LogError(
                        "The Kernel refused the forwarded token with {StatusCode} while resolving flow-epic {FlowEpicId} — service trust misconfigured.",
                        (int)response.StatusCode, flowEpicId);

                    throw new EpicResolutionRejectedException((int)response.StatusCode);
            }

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "The Kernel answered {StatusCode} while resolving flow-epic {FlowEpicId}.",
                    (int)response.StatusCode, flowEpicId);

                throw new EpicResolutionUnavailableException(
                    $"the Kernel answered HTTP {(int)response.StatusCode}");
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            EnsureBodyNamesTheEpic(body, flowEpicId);

            return true;
        }
    }

    /// <summary>
    /// The caller's own bearer token, from the request scope. Resolving it outside a request
    /// throws rather than falling back — a fallback identity is exactly the hole the F5/0
    /// measurement closed.
    /// </summary>
    private string RequireCallerToken()
    {
        const string bearerPrefix = "Bearer ";

        var header = httpContextAccessor.HttpContext?.Request.Headers[HeaderNames.Authorization].ToString();

        if (header is null || !header.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Flow-epic resolution needs the caller's bearer token and there is none in scope.");
        }

        var token = header[bearerPrefix.Length..].Trim();

        if (token.Length == 0)
        {
            throw new InvalidOperationException(
                "Flow-epic resolution needs the caller's bearer token and there is none in scope.");
        }

        return token;
    }

    private static void EnsureBodyNamesTheEpic(string body, Guid flowEpicId)
    {
        FlowEpicResponse? epic;
        try
        {
            epic = JsonSerializer.Deserialize<FlowEpicResponse>(body, JsonOptions);
        }
        catch (JsonException exception)
        {
            throw new EpicResolutionUnavailableException(
                $"the Kernel's answer for flow-epic {flowEpicId} was not valid JSON", exception);
        }

        if (epic is null || epic.Id == Guid.Empty)
        {
            throw new EpicResolutionUnavailableException(
                $"the Kernel's answer for flow-epic {flowEpicId} carried no epic id");
        }
    }
}

/// <summary>
/// Where the Kernel lives and how long we wait for it.
/// </summary>
/// <remarks>
/// <b>The base URL has no default on purpose</b> — the F5 task doc bans the silent
/// <c>?? "http://127.0.0.1:500x"</c> fallback by name: a host missing its configuration must
/// refuse to start (<c>ValidateOnStart</c>), not resolve epics against a developer port.
/// </remarks>
public sealed class ProjectsKernelOptions
{
    /// <summary>Configuration section the options bind from.</summary>
    public const string SectionName = "Projects:Kernel";

    /// <summary>Kernel base URL. Required, no default.</summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>Per-call budget for one resolution, in seconds. Short on purpose: this call sits
    /// inside a user's request, and a Kernel slower than this is, for that user, down.</summary>
    public int TimeoutSeconds { get; set; } = 5;
}

/// <summary>Startup-time validation behind <c>ValidateOnStart</c>.</summary>
public sealed class ProjectsKernelOptionsValidator : IValidateOptions<ProjectsKernelOptions>
{
    public ValidateOptionsResult Validate(string? name, ProjectsKernelOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        if (string.IsNullOrWhiteSpace(options.BaseUrl))
        {
            return ValidateOptionsResult.Fail(
                $"{ProjectsKernelOptions.SectionName}:BaseUrl is required; the flow-epic resolver " +
                "refuses to guess where the Kernel lives (no silent localhost fallback).");
        }

        if (!Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return ValidateOptionsResult.Fail(
                $"{ProjectsKernelOptions.SectionName}:BaseUrl must be an absolute http(s) URL; got '{options.BaseUrl}'.");
        }

        if (options.TimeoutSeconds <= 0)
        {
            return ValidateOptionsResult.Fail(
                $"{ProjectsKernelOptions.SectionName}:TimeoutSeconds must be positive; got {options.TimeoutSeconds}.");
        }

        return ValidateOptionsResult.Success;
    }
}
