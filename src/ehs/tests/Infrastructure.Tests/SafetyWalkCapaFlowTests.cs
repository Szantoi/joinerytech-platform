using FluentAssertions;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.CorrectiveActions.Commands.CompleteCorrectiveAction;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.AddSafetyWalkFinding;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CloseSafetyWalk;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CompleteSafetyWalk;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.ScheduleSafetyWalk;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.StartSafetyWalk;
using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Repositories;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

/// <summary>
/// End-to-end handler flow test for the safety walk FSM with the UNIFIED CAPA:
/// schedule → start → finding (+CAPA spawn) → complete → (CAPA open: close
/// rejected) → CAPA complete → close.
/// Exercises the real handlers against real repositories on PostgreSQL.
/// </summary>
public class SafetyWalkCapaFlowTests : PostgresTestBase
{
    private readonly Guid _tenantId = Guid.NewGuid();

    [Fact]
    public async Task FullSafetyWalkFlow_WithUnifiedCapa_ShouldCloseOnlyAfterCapaCompleted()
    {
        // Arrange — repositories and handlers (as wired by DI)
        var walkRepo = new SafetyWalkRepository(DbContext);
        var capaRepo = new CorrectiveActionRepository(DbContext);
        var locationRepo = new EhsLocationRepository(DbContext);

        var location = EhsLocation.Create(_tenantId, "VAC-A", "A csarnok", LocationKind.Hall);
        await locationRepo.AddAsync(location, CancellationToken.None);

        // 1. Schedule
        var scheduleHandler = new ScheduleSafetyWalkCommandHandler(walkRepo, locationRepo);
        var walkId = await scheduleHandler.Handle(
            new ScheduleSafetyWalkCommand(_tenantId, location.LocationId,
                DateTimeOffset.UtcNow.AddDays(1), Guid.NewGuid(), null),
            CancellationToken.None);

        // 2. Start
        var startHandler = new StartSafetyWalkCommandHandler(walkRepo);
        await startHandler.Handle(new StartSafetyWalkCommand(walkId, _tenantId), CancellationToken.None);

        // 3. Finding with CAPA spawn (unified mechanism)
        var findingHandler = new AddSafetyWalkFindingCommandHandler(walkRepo, capaRepo);
        var findingResult = await findingHandler.Handle(
            new AddSafetyWalkFindingCommand(
                walkId, _tenantId,
                "Hiányzó védőburkolat", Severity.Major, RequiresAction: true,
                PhotoS3Key: null, LinkedRiskAssessmentId: null,
                CapaDescription: "Védőburkolat pótlása",
                CapaAssignedTo: Guid.NewGuid(),
                CapaDueDate: DateTimeOffset.UtcNow.AddDays(7)),
            CancellationToken.None);

        findingResult.CorrectiveActionId.Should().NotBeNull();

        // The CAPA appears on the unified board with SafetyWalk source
        var board = await capaRepo.ListAsync(
            new CapaFilter(Source: CapaSource.SafetyWalk), _tenantId, CancellationToken.None);
        board.Should().ContainSingle().Which.SourceId.Should().Be(walkId);

        // 4. Complete → ActionRequired (finding requires action)
        var completeHandler = new CompleteSafetyWalkCommandHandler(walkRepo);
        var status = await completeHandler.Handle(
            new CompleteSafetyWalkCommand(walkId, _tenantId), CancellationToken.None);
        status.Should().Be(SafetyWalkStatus.ActionRequired);

        // 5. Close rejected while the CAPA is open (domain guard → 409 at the API)
        var closeHandler = new CloseSafetyWalkCommandHandler(walkRepo, capaRepo);
        var closeTooEarly = () => closeHandler.Handle(
            new CloseSafetyWalkCommand(walkId, _tenantId), CancellationToken.None);
        await closeTooEarly.Should().ThrowAsync<InvalidOperationException>();

        // 6. Complete the CAPA on the unified board
        var capaHandler = new CompleteCorrectiveActionCommandHandler(capaRepo);
        await capaHandler.Handle(
            new CompleteCorrectiveActionCommand(findingResult.CorrectiveActionId!.Value, _tenantId),
            CancellationToken.None);

        // 7. Close now succeeds
        await closeHandler.Handle(new CloseSafetyWalkCommand(walkId, _tenantId), CancellationToken.None);

        var closedWalk = await walkRepo.GetByIdAsync(walkId, _tenantId, CancellationToken.None);
        closedWalk!.Status.Should().Be(SafetyWalkStatus.Closed);
        closedWalk.Findings.Should().ContainSingle()
            .Which.CorrectiveActionId.Should().Be(findingResult.CorrectiveActionId);
    }

    [Fact]
    public async Task StartHandler_ShouldThrowKeyNotFound_WhenWalkMissing()
    {
        // Arrange
        var startHandler = new StartSafetyWalkCommandHandler(new SafetyWalkRepository(DbContext));

        // Act
        var act = () => startHandler.Handle(
            new StartSafetyWalkCommand(Guid.NewGuid(), _tenantId), CancellationToken.None);

        // Assert — maps to 404 at the API layer
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
