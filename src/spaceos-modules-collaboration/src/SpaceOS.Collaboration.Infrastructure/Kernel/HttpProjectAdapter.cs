using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SpaceOS.Collaboration.Application.Adapters;

namespace SpaceOS.Collaboration.Infrastructure.Kernel;

/// <summary>
/// Resolves work-scope anchors against the Kernel's <c>GET /api/flow-epics/{id}</c> (B2B-10 F5/2).
/// </summary>
/// <remarks>
/// <para>
/// <b>On-behalf-of:</b> every call forwards the current request's own bearer token
/// (<see cref="IOnBehalfOfTokenSource"/>). The F5/0 measurement is the reason: one token serves
/// both audiences, the Kernel scopes its rows by the token's <c>tid</c>, and a
/// <c>client_credentials</c> identity carries no tenant at all — so forwarding is the only path
/// on which the Kernel's 404 keeps meaning "not yours".
/// </para>
/// <para>
/// <b>The error map is the contract</b> (F5 task doc): 404 → <c>null</c> (no such epic for this
/// caller); 401/403 → <see cref="ProjectResolutionRejectedException"/> (trust misconfigured —
/// retrying will not help); timeout, connection failure, 5xx and a malformed body →
/// <see cref="ProjectResolutionUnavailableException"/> (cannot answer NOW). Nothing else is
/// folded into <c>null</c>, so an outage can never impersonate "bad epic id".
/// </para>
/// </remarks>
public sealed class HttpProjectAdapter(
    HttpClient httpClient,
    IOnBehalfOfTokenSource tokens,
    IOptions<KernelProjectAdapterOptions> options,
    ILogger<HttpProjectAdapter> logger) : IProjectAdapter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>The Kernel's flow-epic answer; only the fields the anchor needs.</summary>
    private sealed record FlowEpicResponse(Guid Id, string? Title);

    public async Task<ProjectReference?> ResolveFlowEpicAsync(
        Guid flowEpicId, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/flow-epics/{flowEpicId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokens.RequireToken());

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
                "Kernel anchor resolution for flow-epic {FlowEpicId} timed out after {TimeoutSeconds}s.",
                flowEpicId, options.Value.TimeoutSeconds);

            throw new ProjectResolutionUnavailableException(
                $"timed out after {options.Value.TimeoutSeconds}s");
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(
                exception, "Kernel anchor resolution for flow-epic {FlowEpicId} could not connect.", flowEpicId);

            throw new ProjectResolutionUnavailableException("the Kernel could not be reached", exception);
        }

        using (response)
        {
            switch (response.StatusCode)
            {
                case HttpStatusCode.NotFound:
                    // Absent and not-ours are one answer — the Kernel's row filter made that
                    // choice, and it is the same one our own guard makes.
                    return null;

                case HttpStatusCode.Unauthorized:
                case HttpStatusCode.Forbidden:
                    logger.LogError(
                        "The Kernel refused the forwarded token with {StatusCode} while resolving flow-epic {FlowEpicId} — service trust misconfigured.",
                        (int)response.StatusCode, flowEpicId);

                    throw new ProjectResolutionRejectedException((int)response.StatusCode);
            }

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "The Kernel answered {StatusCode} while resolving flow-epic {FlowEpicId}.",
                    (int)response.StatusCode, flowEpicId);

                throw new ProjectResolutionUnavailableException(
                    $"the Kernel answered HTTP {(int)response.StatusCode}");
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            var epic = Deserialize(body, flowEpicId);

            return new ProjectReference(epic.Id, epic.Title ?? string.Empty);
        }
    }

    private static FlowEpicResponse Deserialize(string body, Guid flowEpicId)
    {
        FlowEpicResponse? epic;
        try
        {
            epic = JsonSerializer.Deserialize<FlowEpicResponse>(body, JsonOptions);
        }
        catch (JsonException exception)
        {
            throw new ProjectResolutionUnavailableException(
                $"the Kernel's answer for flow-epic {flowEpicId} was not valid JSON", exception);
        }

        if (epic is null || epic.Id == Guid.Empty)
        {
            throw new ProjectResolutionUnavailableException(
                $"the Kernel's answer for flow-epic {flowEpicId} carried no epic id");
        }

        return epic;
    }
}
