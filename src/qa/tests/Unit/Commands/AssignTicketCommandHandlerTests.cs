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
/// Unit tests for AssignTicketCommandHandler.
/// </summary>
public class AssignTicketCommandHandlerTests
{
    private readonly Mock<ITicketRepository> _mockRepository;
    private readonly AssignTicketCommandHandler _handler;
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly TicketId _ticketId = TicketId.New();
    private readonly Guid _assigneeId = Guid.NewGuid();

    public AssignTicketCommandHandlerTests()
    {
        _mockRepository = new Mock<ITicketRepository>();
        _handler = new AssignTicketCommandHandler(_mockRepository.Object);
    }

    [Fact]
    public async Task Handle_TicketExists_ShouldAssignSuccessfully()
    {
        // Arrange
        var reporterId = Guid.NewGuid();
        var ticket = Ticket.Create(
            _tenantId,
            TicketType.Warranty,
            CrmTaskPriority.Medium,
            "Test Ticket",
            "Test Description",
            reporterId);

        _mockRepository
            .Setup(r => r.GetByIdAsync(_ticketId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ticket);

        _mockRepository
            .Setup(r => r.UpdateAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var command = new AssignTicketCommand(_ticketId, _assigneeId, _tenantId);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeTrue();
        ticket.AssignedTo.Should().Be(_assigneeId);
        ticket.Status.Should().Be(TicketStatus.Assigned);

        _mockRepository.Verify(
            r => r.GetByIdAsync(_ticketId, _tenantId, It.IsAny<CancellationToken>()),
            Times.Once);

        _mockRepository.Verify(
            r => r.UpdateAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_TicketNotFound_ShouldReturnNotFound()
    {
        // Arrange
        _mockRepository
            .Setup(r => r.GetByIdAsync(_ticketId, _tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Ticket?)null);

        var command = new AssignTicketCommand(_ticketId, _assigneeId, _tenantId);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeFalse();
        result.Status.Should().Be(ResultStatus.NotFound);
        result.Errors.Should().Contain("Ticket not found");

        _mockRepository.Verify(
            r => r.GetByIdAsync(_ticketId, _tenantId, It.IsAny<CancellationToken>()),
            Times.Once);

        _mockRepository.Verify(
            r => r.UpdateAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Handle_RepositoryThrowsException_ShouldReturnError()
    {
        // Arrange
        _mockRepository
            .Setup(r => r.GetByIdAsync(_ticketId, _tenantId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        var command = new AssignTicketCommand(_ticketId, _assigneeId, _tenantId);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsSuccess.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
        result.Errors.First().Should().Contain("Failed to assign ticket");
        result.Errors.First().Should().Contain("Database error");
    }
}
