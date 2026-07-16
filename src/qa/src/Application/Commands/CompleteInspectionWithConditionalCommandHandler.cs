using Ardalis.Result;
using SpaceOS.Kernel.Domain.Exceptions;
using MediatR;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Exceptions;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.ValueObjects;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for CompleteInspectionWithConditionalCommand (ADR-063).
/// Completes the inspection with Conditional result AND spawns the rework Ticket
/// (type Repair, linked via InspectionId, reported by the inspector) in the same
/// unit of work — the "conditional pass" outcome must never get lost without a
/// repair trail. The inspection stays immutable afterwards; the repair loop runs
/// in the Ticket FSM and the re-check is a new Inspection (CreateRework).
/// </summary>
public class CompleteInspectionWithConditionalCommandHandler
    : IRequestHandler<CompleteInspectionWithConditionalCommand, Result<Guid>>
{
    private readonly IInspectionRepository _inspectionRepository;
    private readonly ITicketRepository _ticketRepository;
    private readonly IQACheckpointRepository _checkpointRepository;

    public CompleteInspectionWithConditionalCommandHandler(
        IInspectionRepository inspectionRepository,
        ITicketRepository ticketRepository,
        IQACheckpointRepository checkpointRepository)
    {
        _inspectionRepository = inspectionRepository;
        _ticketRepository = ticketRepository;
        _checkpointRepository = checkpointRepository;
    }

    public async Task<Result<Guid>> Handle(CompleteInspectionWithConditionalCommand request, CancellationToken ct)
    {
        try
        {
            var inspection = await _inspectionRepository
                .GetByIdAsync(request.InspectionId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (inspection == null)
                return Result<Guid>.NotFound("Inspection not found");

            // Convert inputs to value objects (payload validation throws before any save)
            var failureNotes = request.FailureNotes
                .Select(fn => FailureNote.Create(fn.FailureType, fn.Description, fn.PhotoUrl))
                .ToList();

            // FSM transition + Conditional result (guard throws before any save)
            inspection.CompleteWithConditional(failureNotes, request.Notes);

            // Checkpoint name only decorates the ticket title — optional lookup
            var checkpoint = await _checkpointRepository
                .GetByIdAsync(inspection.CheckpointId, request.TenantId, ct)
                .ConfigureAwait(false);

            // Rework ticket built BEFORE any save: its payload validation must not
            // leave a Conditional inspection behind without a repair trail.
            var ticket = Ticket.Create(
                request.TenantId,
                TicketType.Repair,
                request.ReworkTicketPriority,
                BuildTicketTitle(checkpoint?.Name),
                BuildTicketDescription(inspection, failureNotes, request.Notes),
                reportedBy: inspection.InspectorId,
                orderId: inspection.OrderId,
                productId: inspection.ProductId,
                inspectionId: inspection.Id.Value);

            // Ticket first: the repositories share the scoped QADbContext, so this
            // single SaveChanges persists the completed inspection AND the spawned
            // ticket atomically (the inspection is tracked with its changes).
            await _ticketRepository.AddAsync(ticket, ct).ConfigureAwait(false);
            // Defensive flush for repository implementations without a shared context.
            await _inspectionRepository.UpdateAsync(inspection, ct).ConfigureAwait(false);

            return Result<Guid>.Success(ticket.Id.Value);
        }
        catch (InvalidStatusTransitionException ex)
        {
            // Illegal FSM transition / status-guarded action -> HTTP 409 at the endpoint
            return Result<Guid>.Conflict(ex.Message);
        }
        catch (DomainException ex)
        {
            // Aggregate payload validation -> HTTP 400 at the endpoint
            return Result<Guid>.Invalid(new ValidationError(ex.Message));
        }
        catch (Exception ex)
        {
            return Result<Guid>.Error($"Failed to complete inspection with conditional: {ex.Message}");
        }
    }

    /// <summary>
    /// Ticket title (Hungarian: the title/description are user-facing CONTENT for the
    /// portal, not wire enum keys — the ADR-059 wire-language question is unaffected).
    /// Checkpoint name max 100 chars → always within the 5-200 title constraint.
    /// </summary>
    private static string BuildTicketTitle(string? checkpointName)
        => string.IsNullOrWhiteSpace(checkpointName)
            ? "Feltételes megfelelés — javítás szükséges"
            : $"Feltételes megfelelés — javítás: {checkpointName}";

    /// <summary>
    /// Ticket description: the documented minor defects + inspector note + source
    /// inspection reference — the repair crew sees WHAT to fix without opening QA.
    /// </summary>
    private static string BuildTicketDescription(
        Inspection inspection,
        IReadOnlyList<FailureNote> failureNotes,
        string? notes)
    {
        var lines = new List<string>
        {
            "Az átvizsgálás feltételesen megfelelt (Conditional) — javítás és újraellenőrzés szükséges.",
            "Dokumentált hibák:"
        };
        lines.AddRange(failureNotes.Select(fn => $"- {fn.FailureType}: {fn.Description}"));

        if (!string.IsNullOrWhiteSpace(notes))
            lines.Add($"Ellenőri megjegyzés: {notes}");

        lines.Add($"Forrás-átvizsgálás: {inspection.Id.Value}");

        return string.Join(Environment.NewLine, lines);
    }
}
