using Ardalis.Result;
using FluentAssertions;
using Moq;
using SpaceOS.Modules.QA.Application.Commands;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Unit.Commands;

/// <summary>
/// Command handlers must translate domain guard failures to the module error
/// contract: InvalidStatusTransitionException → Result.Conflict (HTTP 409),
/// plain DomainException payload validation → Result.Invalid (HTTP 400).
/// </summary>
public class TransitionResultMappingTests
{
    private readonly Mock<ITicketRepository> _ticketRepository = new();
    private readonly Mock<IInspectionRepository> _inspectionRepository = new();
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly TicketId _ticketId = TicketId.New();
    private readonly InspectionId _inspectionId = InspectionId.New();

    private static Ticket CreateTicket() => Ticket.Create(
        Guid.NewGuid(),
        TicketType.Warranty,
        CrmTaskPriority.Medium,
        "Fiók nem csúszik rendesen",
        "A felső fiók sínje szorul, nem záródik teljesen.",
        Guid.NewGuid());

    private static Inspection CreateInspection() => Inspection.Create(
        Guid.NewGuid(),
        QACheckpointId.New(),
        Guid.NewGuid(),
        DateTime.UtcNow.AddHours(1));

    private void SetupTicket(Ticket ticket) => _ticketRepository
        .Setup(r => r.GetByIdAsync(_ticketId, _tenantId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(ticket);

    private void SetupInspection(Inspection inspection) => _inspectionRepository
        .Setup(r => r.GetByIdAsync(_inspectionId, _tenantId, It.IsAny<CancellationToken>()))
        .ReturnsAsync(inspection);

    [Fact]
    public async Task StartTicket_IllegalTransition_ReturnsConflict()
    {
        SetupTicket(CreateTicket()); // Reported — start needs Assigned
        var handler = new StartTicketCommandHandler(_ticketRepository.Object);

        var result = await handler.Handle(new StartTicketCommand(_ticketId, _tenantId), default);

        result.Status.Should().Be(ResultStatus.Conflict);
        result.Errors.Should().ContainSingle(e => e.Contains("Cannot transition from Reported to InProgress"));
    }

    [Fact]
    public async Task ResolveTicket_WithoutActions_ReturnsInvalid()
    {
        var ticket = CreateTicket();
        ticket.Assign(Guid.NewGuid());
        ticket.Start();
        SetupTicket(ticket);
        var handler = new ResolveTicketCommandHandler(_ticketRepository.Object);

        var result = await handler.Handle(
            new ResolveTicketCommand(_ticketId, new List<ResolutionActionInput>(), null, _tenantId),
            default);

        result.Status.Should().Be(ResultStatus.Invalid);
        result.ValidationErrors.Should().ContainSingle(
            e => e.ErrorMessage.Contains("At least one resolution action is required"));
    }

    [Fact]
    public async Task RejectTicket_WithoutReason_ReturnsInvalid()
    {
        var ticket = CreateTicket();
        ticket.Assign(Guid.NewGuid());
        ticket.Start();
        SetupTicket(ticket);
        var handler = new RejectTicketCommandHandler(_ticketRepository.Object);

        var result = await handler.Handle(new RejectTicketCommand(_ticketId, "  ", _tenantId), default);

        result.Status.Should().Be(ResultStatus.Invalid);
    }

    [Fact]
    public async Task ReopenTicket_NotRejected_ReturnsConflict()
    {
        SetupTicket(CreateTicket()); // Reported — reopen needs Rejected
        var handler = new ReopenTicketCommandHandler(_ticketRepository.Object);

        var result = await handler.Handle(new ReopenTicketCommand(_ticketId, _tenantId), default);

        result.Status.Should().Be(ResultStatus.Conflict);
    }

    [Fact]
    public async Task EscalateTicket_NotHigherPriority_ReturnsConflict()
    {
        SetupTicket(CreateTicket()); // Medium
        var handler = new EscalateTicketPriorityCommandHandler(_ticketRepository.Object);

        var result = await handler.Handle(
            new EscalateTicketPriorityCommand(_ticketId, CrmTaskPriority.Low, _tenantId),
            default);

        result.Status.Should().Be(ResultStatus.Conflict);
        result.Errors.Should().ContainSingle(e => e.Contains("must be higher"));
    }

    [Fact]
    public async Task AssignTicket_EmptyAssignee_ReturnsInvalid()
    {
        SetupTicket(CreateTicket());
        var handler = new AssignTicketCommandHandler(_ticketRepository.Object);

        var result = await handler.Handle(
            new AssignTicketCommand(_ticketId, Guid.Empty, _tenantId),
            default);

        result.Status.Should().Be(ResultStatus.Invalid);
    }

    [Fact]
    public async Task StartInspection_AlreadyCompleted_ReturnsConflict()
    {
        var inspection = CreateInspection();
        inspection.Start();
        inspection.CompleteWithPass();
        SetupInspection(inspection);
        var handler = new StartInspectionCommandHandler(_inspectionRepository.Object);

        var result = await handler.Handle(new StartInspectionCommand(_inspectionId, _tenantId), default);

        result.Status.Should().Be(ResultStatus.Conflict);
    }

    [Fact]
    public async Task CompleteInspectionFail_WithoutNotes_ReturnsInvalid()
    {
        var inspection = CreateInspection();
        inspection.Start();
        SetupInspection(inspection);
        var handler = new CompleteInspectionWithFailCommandHandler(_inspectionRepository.Object);

        var result = await handler.Handle(
            new CompleteInspectionWithFailCommand(
                _inspectionId, new List<FailureNoteInput>(), null, _tenantId),
            default);

        result.Status.Should().Be(ResultStatus.Invalid);
        result.ValidationErrors.Should().ContainSingle(
            e => e.ErrorMessage.Contains("Failure notes are required"));
    }

    [Fact]
    public async Task CompleteInspectionPass_FromPlanned_ReturnsConflict()
    {
        SetupInspection(CreateInspection()); // Planned — complete needs InProgress
        var handler = new CompleteInspectionWithPassCommandHandler(_inspectionRepository.Object);

        var result = await handler.Handle(
            new CompleteInspectionWithPassCommand(_inspectionId, null, _tenantId),
            default);

        result.Status.Should().Be(ResultStatus.Conflict);
    }
}
