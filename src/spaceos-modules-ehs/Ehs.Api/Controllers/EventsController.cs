// Ehs.Api/Controllers/EventsController.cs

using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Ehs.Application.Commands;
using Ehs.Application.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ehs.Api.Controllers;

/// <summary>
/// Controller for EHS incident event reporting.
/// </summary>
[ApiController]
[Route("api/ehs/events")]
[Authorize]
public sealed class EventsController : ControllerBase
{
    private readonly IMediator _mediator;

    public EventsController(IMediator mediator) => _mediator = mediator;

    /// <summary>
    /// Report a new incident event.
    /// POST /api/ehs/events
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<EventResponse>> ReportIncident(
        [FromBody] ReportIncidentRequest request,
        CancellationToken ct)
    {
        var command = new ReportIncidentCommand(
            request.EventId,
            request.Type,
            request.Payload,
            request.Meta);

        var result = await _mediator.Send(command, ct).ConfigureAwait(false);

        if (result.IsSuccess && result.Status == ResultStatus.Created)
            return CreatedAtAction(nameof(ReportIncident), new { id = result.Value.EventId }, result.Value);

        return this.ToActionResult(result);
    }
}

/// <summary>
/// Request DTO for reporting an incident.
/// </summary>
public sealed record ReportIncidentRequest
{
    public Guid EventId { get; init; }
    public string Type { get; init; } = "INCIDENT_REPORTED";
    public IncidentPayload Payload { get; init; } = new();
    public EventMeta? Meta { get; init; }
}
