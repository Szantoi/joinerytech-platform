// Ehs.Application/Commands/ReportIncidentCommand.cs

using Ardalis.Result;
using Ehs.Application.Common;
using Ehs.Application.DTOs;
using Ehs.Domain.Aggregates;
using Ehs.Domain.Interfaces;
using Ehs.Domain.ValueObjects;
using FluentValidation;
using MediatR;
using System.Text.Json;

namespace Ehs.Application.Commands;

/// <summary>
/// Command to report a new incident event.
/// </summary>
public sealed record ReportIncidentCommand(
    Guid EventId,
    string Type,
    IncidentPayload Payload,
    EventMeta? Meta) : IRequest<Result<EventResponse>>;

/// <summary>
/// Validator for ReportIncidentCommand.
/// </summary>
public sealed class ReportIncidentCommandValidator : AbstractValidator<ReportIncidentCommand>
{
    public ReportIncidentCommandValidator()
    {
        RuleFor(x => x.EventId)
            .NotEmpty()
            .WithMessage("EventId cannot be empty.");

        RuleFor(x => x.Type)
            .NotEmpty()
            .Equal("INCIDENT_REPORTED")
            .WithMessage("Type must be 'INCIDENT_REPORTED'.");

        RuleFor(x => x.Payload.ReporterId)
            .NotEmpty()
            .WithMessage("ReporterId cannot be empty.");

        RuleFor(x => x.Payload.IncidentType)
            .NotEmpty()
            .Must(t => t == "near-miss" || t == "injury" || t == "property")
            .WithMessage("IncidentType must be one of: near-miss, injury, property.");

        RuleFor(x => x.Payload.LocationId)
            .NotEmpty()
            .MaximumLength(100)
            .WithMessage("LocationId is required and must not exceed 100 characters.");

        RuleFor(x => x.Payload.Description)
            .NotEmpty()
            .MaximumLength(2000)
            .WithMessage("Description is required and must not exceed 2000 characters.");

        RuleFor(x => x.Payload.PhotoS3Key)
            .MaximumLength(500)
            .When(x => !string.IsNullOrWhiteSpace(x.Payload.PhotoS3Key))
            .WithMessage("PhotoS3Key must not exceed 500 characters.");
    }
}

/// <summary>
/// Handler for ReportIncidentCommand.
/// </summary>
public sealed class ReportIncidentCommandHandler : IRequestHandler<ReportIncidentCommand, Result<EventResponse>>
{
    private readonly IEhsEventRepository _repository;
    private readonly ICurrentUserContext _currentUser;

    public ReportIncidentCommandHandler(
        IEhsEventRepository repository,
        ICurrentUserContext currentUser)
    {
        _repository = repository;
        _currentUser = currentUser;
    }

    public async Task<Result<EventResponse>> Handle(ReportIncidentCommand request, CancellationToken ct)
    {
        // 1. Parse EventId
        EventId eventId;
        try
        {
            eventId = EventId.From(request.EventId);
        }
        catch (ArgumentException ex)
        {
            return Result<EventResponse>.Invalid(new ValidationError(ex.Message));
        }

        // 2. Idempotency check: if eventId already exists, return existing event (200 OK, not 201)
        var existing = await _repository.GetByEventIdAsync(eventId, _currentUser.TenantId, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            return Result<EventResponse>.Success(new EventResponse
            {
                EventId = existing.EventId.Value,
                Sequence = existing.Sequence,
                Status = "accepted",
                ServerTimestamp = existing.CreatedAt
            });
        }

        // 3. Validate timestamp drift (client vs server, max 2 hours)
        if (request.Meta is not null)
        {
            var drift = Math.Abs((DateTimeOffset.UtcNow - request.Meta.ClientTimestamp).TotalHours);
            if (drift > 2.0)
            {
                return Result<EventResponse>.Invalid(
                    new ValidationError("Clock skew too large (max 2 hours drift allowed)."));
            }
        }

        // 4. Serialize payload and meta to JSON
        var payloadJson = JsonSerializer.Serialize(request.Payload);
        var metaJson = request.Meta is not null ? JsonSerializer.Serialize(request.Meta) : null;

        // 5. Create event aggregate
        var ehsEvent = EhsEvent.Create(
            eventId,
            request.Type,
            payloadJson,
            metaJson,
            _currentUser.TenantId);

        // 6. Persist to event store
        await _repository.AddAsync(ehsEvent, ct).ConfigureAwait(false);

        // 7. Return response
        return Result<EventResponse>.Created(new EventResponse
        {
            EventId = ehsEvent.EventId.Value,
            Sequence = ehsEvent.Sequence,
            Status = "accepted",
            ServerTimestamp = ehsEvent.CreatedAt
        }, $"/api/ehs/events/{ehsEvent.EventId.Value}");
    }
}
