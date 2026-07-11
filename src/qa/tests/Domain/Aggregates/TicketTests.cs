using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Events;
using SpaceOS.Modules.QA.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Domain.Aggregates;

public class TicketTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _reportedBy = Guid.NewGuid();
    private readonly Guid _assigneeId = Guid.NewGuid();
    private readonly Guid _orderId = Guid.NewGuid();

    [Fact]
    public void Create_ShouldCreateValidTicket()
    {
        // Arrange & Act
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Warranty,
            CrmTaskPriority.High,
            "Door hinge defect",
            "Customer reports door hinge came loose after 2 weeks",
            _reportedBy,
            _orderId);

        // Assert
        ticket.Should().NotBeNull();
        ticket.TicketType.Should().Be(TicketType.Warranty);
        ticket.Priority.Should().Be(CrmTaskPriority.High);
        ticket.Title.Should().Be("Door hinge defect");
        ticket.Status.Should().Be(TicketStatus.Reported);
        ticket.ReportedBy.Should().Be(_reportedBy);
        ticket.OrderId.Should().Be(_orderId);

        var domainEvents = ticket.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<TicketReportedEvent>();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidTitle_ShouldThrow(string? invalidTitle)
    {
        // Act
        var act = () => Ticket.Create(
            _tenantId,
            TicketType.Warranty,
            CrmTaskPriority.High,
            invalidTitle!,
            "Valid description with enough characters",
            _reportedBy);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Ticket title is required");
    }

    [Theory]
    [InlineData("ABC")] // Too short
    public void Create_WithShortTitle_ShouldThrow(string shortTitle)
    {
        // Act
        var act = () => Ticket.Create(
            _tenantId,
            TicketType.Warranty,
            CrmTaskPriority.High,
            shortTitle,
            "Valid description",
            _reportedBy);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Ticket title must be between 5 and 200 characters");
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("Short")]
    public void Create_WithInvalidDescription_ShouldThrow(string invalidDescription)
    {
        // Act
        var act = () => Ticket.Create(
            _tenantId,
            TicketType.Warranty,
            CrmTaskPriority.High,
            "Valid Title",
            invalidDescription,
            _reportedBy);

        // Assert
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Assign_ShouldAssignTicketToUser()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Repair,
            CrmTaskPriority.Medium,
            "Repair door frame",
            "Door frame needs realignment",
            _reportedBy);

        ticket.ClearDomainEvents();

        // Act
        ticket.Assign(_assigneeId);

        // Assert
        ticket.Status.Should().Be(TicketStatus.Assigned);
        ticket.AssignedTo.Should().Be(_assigneeId);
        ticket.AssignedAt.Should().NotBeNull();

        var domainEvents = ticket.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<TicketAssignedEvent>();
    }

    [Fact]
    public void Assign_FromInProgressStatus_ShouldThrow()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Repair,
            CrmTaskPriority.Medium,
            "Repair door frame",
            "Door frame needs realignment",
            _reportedBy);

        ticket.Assign(_assigneeId);
        ticket.Start();

        // Act
        var act = () => ticket.Assign(Guid.NewGuid());

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot transition from InProgress to Assigned");
    }

    [Fact]
    public void Start_ShouldTransitionToInProgress()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Repair,
            CrmTaskPriority.Medium,
            "Repair door frame",
            "Door frame needs realignment",
            _reportedBy);

        ticket.Assign(_assigneeId);
        ticket.ClearDomainEvents();

        // Act
        ticket.Start();

        // Assert
        ticket.Status.Should().Be(TicketStatus.InProgress);
        ticket.StartedAt.Should().NotBeNull();

        var domainEvents = ticket.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<TicketStartedEvent>();
    }

    [Fact]
    public void Resolve_WithResolutionActions_ShouldResolveTicket()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Repair,
            CrmTaskPriority.Medium,
            "Repair door frame",
            "Door frame needs realignment",
            _reportedBy);

        ticket.Assign(_assigneeId);
        ticket.Start();
        ticket.ClearDomainEvents();

        var resolutionActions = new List<ResolutionAction>
        {
            ResolutionAction.Create(ActionType.Repair, "Realigned door frame", Money.Create(15000m, "HUF")),
            ResolutionAction.Create(ActionType.Replace, "Replaced hinges", Money.Create(8000m, "HUF"))
        };

        // Act
        ticket.Resolve(resolutionActions, "Successfully repaired");

        // Assert
        ticket.Status.Should().Be(TicketStatus.Resolved);
        ticket.ResolvedAt.Should().NotBeNull();
        ticket.ResolutionActions.Should().HaveCount(2);
        ticket.ResolutionNotes.Should().Be("Successfully repaired");

        var domainEvents = ticket.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<TicketResolvedEvent>();

        var resolvedEvent = (TicketResolvedEvent)domainEvents.First();
        resolvedEvent.ActionTypes.Should().Contain(ActionType.Repair);
        resolvedEvent.ActionTypes.Should().Contain(ActionType.Replace);
    }

    [Fact]
    public void Resolve_WithoutResolutionActions_ShouldThrow()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Repair,
            CrmTaskPriority.Medium,
            "Repair door frame",
            "Door frame needs realignment",
            _reportedBy);

        ticket.Assign(_assigneeId);
        ticket.Start();

        // Act
        var act = () => ticket.Resolve(new List<ResolutionAction>());

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("At least one resolution action is required");
    }

    [Fact]
    public void Reject_WithReason_ShouldRejectTicket()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Warranty,
            CrmTaskPriority.High,
            "Warranty claim",
            "Customer claims defect but warranty expired",
            _reportedBy);

        ticket.Assign(_assigneeId);
        ticket.Start();
        ticket.ClearDomainEvents();

        // Act
        ticket.Reject("Warranty period expired");

        // Assert
        ticket.Status.Should().Be(TicketStatus.Rejected);
        ticket.ResolutionNotes.Should().Be("Warranty period expired");

        var domainEvents = ticket.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<TicketRejectedEvent>();
    }

    [Fact]
    public void Reject_WithoutReason_ShouldThrow()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Warranty,
            CrmTaskPriority.High,
            "Warranty claim",
            "Customer claims defect",
            _reportedBy);

        ticket.Assign(_assigneeId);
        ticket.Start();

        // Act
        var act = () => ticket.Reject(string.Empty);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Rejection reason is required");
    }

    [Fact]
    public void Reopen_FromRejectedStatus_ShouldReopenTicket()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Warranty,
            CrmTaskPriority.High,
            "Warranty claim",
            "Customer claims defect",
            _reportedBy);

        ticket.Assign(_assigneeId);
        ticket.Start();
        ticket.Reject("Initial rejection reason");
        ticket.ClearDomainEvents();

        // Act
        ticket.Reopen();

        // Assert
        ticket.Status.Should().Be(TicketStatus.Reported);
        ticket.AssignedTo.Should().BeNull();
        ticket.AssignedAt.Should().BeNull();
        ticket.StartedAt.Should().BeNull();

        var domainEvents = ticket.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<TicketReopenedEvent>();
    }

    [Fact]
    public void EscalatePriority_ShouldIncreasePriority()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Warranty,
            CrmTaskPriority.Low,
            "Warranty claim",
            "Customer reports minor issue",
            _reportedBy);

        ticket.ClearDomainEvents();

        // Act
        ticket.EscalatePriority(CrmTaskPriority.High);

        // Assert
        ticket.Priority.Should().Be(CrmTaskPriority.High);

        var domainEvents = ticket.GetDomainEvents();
        domainEvents.Should().HaveCount(1);
        domainEvents.First().Should().BeOfType<TicketPriorityEscalatedEvent>();

        var escalatedEvent = (TicketPriorityEscalatedEvent)domainEvents.First();
        escalatedEvent.OldPriority.Should().Be(CrmTaskPriority.Low);
        escalatedEvent.NewPriority.Should().Be(CrmTaskPriority.High);
    }

    [Fact]
    public void EscalatePriority_ToLowerPriority_ShouldThrow()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Warranty,
            CrmTaskPriority.High,
            "Warranty claim",
            "Customer reports issue",
            _reportedBy);

        // Act
        var act = () => ticket.EscalatePriority(CrmTaskPriority.Low);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("New priority must be higher than current priority");
    }

    [Fact]
    public void EscalatePriority_OnResolvedTicket_ShouldThrow()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Repair,
            CrmTaskPriority.Low,
            "Repair door",
            "Door needs repair",
            _reportedBy);

        ticket.Assign(_assigneeId);
        ticket.Start();

        var resolutionActions = new List<ResolutionAction>
        {
            ResolutionAction.Create(ActionType.Repair, "Repaired", Money.Zero("HUF"))
        };

        ticket.Resolve(resolutionActions);

        // Act
        var act = () => ticket.EscalatePriority(CrmTaskPriority.Critical);

        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot escalate resolved tickets");
    }

    [Fact]
    public void UpdateDescription_ShouldUpdateTicketDescription()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Missing,
            CrmTaskPriority.Medium,
            "Missing hinges",
            "Customer reports missing hinges in delivery",
            _reportedBy);

        // Act
        ticket.UpdateDescription("Customer reports 2 hinges missing, needs replacement shipment");

        // Assert
        ticket.Description.Should().Be("Customer reports 2 hinges missing, needs replacement shipment");
    }

    [Fact]
    public void AddResolutionAction_ToInProgressTicket_ShouldAddAction()
    {
        // Arrange
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Repair,
            CrmTaskPriority.High,
            "Repair door",
            "Door needs multiple repairs",
            _reportedBy);

        ticket.Assign(_assigneeId);
        ticket.Start();

        // Act
        ticket.AddResolutionAction(ActionType.Repair, "Fixed hinge", 5000m);

        // Assert
        ticket.ResolutionActions.Should().HaveCount(1);
        ticket.ResolutionActions.First().ActionType.Should().Be(ActionType.Repair);
        ticket.ResolutionActions.First().Cost.Amount.Should().Be(5000m);
    }
}
