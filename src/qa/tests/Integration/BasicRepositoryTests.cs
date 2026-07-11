using FluentAssertions;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;
using SpaceOS.Modules.QA.Domain.ValueObjects;
using SpaceOS.Modules.QA.Infrastructure.Persistence;
using SpaceOS.Modules.QA.Infrastructure.Persistence.Repositories;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Integration;

/// <summary>
/// Integration tests for QA repositories using Testcontainers PostgreSQL.
/// Tests cover CRUD operations, multi-tenancy, and FSM state transitions.
/// </summary>
[Collection("QA Integration Tests")]
public class BasicRepositoryTests
{
    private readonly IntegrationTestFixture _fixture;

    public BasicRepositoryTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
    }

    /// <summary>
    /// Test Scenario 1: Create and retrieve a QACheckpoint
    /// Verifies basic CRUD and 3-param tenant filtering pattern.
    /// </summary>
    [Fact]
    public async Task QACheckpointRepository_CanCreateAndRetrieveCheckpoint()
    {
        // Arrange
        var context = _fixture.CreateContext();
        var tenantId = Guid.NewGuid();
        var checkpoint = QACheckpoint.Create(
            tenantId,
            "Visual Inspection Checkpoint",
            CheckpointType.Incoming,
            CriticalLevel.Critical,
            "Check for surface defects and color matching");

        var repository = new QACheckpointRepository(context);

        // Act
        await repository.AddAsync(checkpoint);
        var retrieved = await repository.GetByIdAsync(checkpoint.Id, tenantId);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Id.Should().Be(checkpoint.Id);
        retrieved.Name.Should().Be("Visual Inspection Checkpoint");
        retrieved.CheckpointType.Should().Be(CheckpointType.Incoming);
        retrieved.CriticalLevel.Should().Be(CriticalLevel.Critical);
        retrieved.IsActive.Should().BeTrue();
    }

    /// <summary>
    /// Test Scenario 2: Update checkpoint and add criteria (owned collection)
    /// Verifies that owned collections are properly persisted and retrieved.
    /// </summary>
    [Fact]
    public async Task QACheckpointRepository_CanUpdateCheckpointWithCriteria()
    {
        // Arrange
        var context = _fixture.CreateContext();
        var tenantId = Guid.NewGuid();
        var checkpoint = QACheckpoint.Create(
            tenantId,
            "Dimensional Check",
            CheckpointType.InProcess,
            CriticalLevel.Major,
            "Verify dimensions match specification");

        var repository = new QACheckpointRepository(context);
        await repository.AddAsync(checkpoint);

        // Act - Add criteria to checkpoint
        checkpoint.AddCriteria(CriteriaType.Dimensional, "Width must be within ±0.5mm of 2500mm");
        checkpoint.AddCriteria(CriteriaType.Functional, "Height must be within ±0.5mm of 2000mm");
        await repository.UpdateAsync(checkpoint);

        // Retrieve and verify
        var retrieved = await repository.GetByIdAsync(checkpoint.Id, tenantId);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Criteria.Count.Should().Be(2);
        retrieved.Criteria.Should().Contain(c => c.Type == CriteriaType.Dimensional);
        retrieved.Criteria.Should().Contain(c => c.Type == CriteriaType.Functional);
    }

    /// <summary>
    /// Test Scenario 3: Create and retrieve an Inspection
    /// Verifies basic Inspection CRUD with proper FK relationships.
    /// </summary>
    [Fact]
    public async Task InspectionRepository_CanCreateAndRetrieveInspection()
    {
        // Arrange
        var context = _fixture.CreateContext();
        var tenantId = Guid.NewGuid();

        // First create a checkpoint (FK dependency)
        var checkpoint = QACheckpoint.Create(
            tenantId,
            "Assembly Check",
            CheckpointType.Final,
            CriticalLevel.Critical);
        var checkpointRepo = new QACheckpointRepository(context);
        await checkpointRepo.AddAsync(checkpoint);

        // Create inspection
        var inspection = Inspection.Create(
            tenantId,
            checkpoint.Id,
            Guid.NewGuid(),  // inspector ID
            DateTime.UtcNow.AddHours(1),
            orderId: Guid.NewGuid());

        var inspectionRepo = new InspectionRepository(context);

        // Act
        await inspectionRepo.AddAsync(inspection);
        var retrieved = await inspectionRepo.GetByIdAsync(inspection.Id, tenantId);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Id.Should().Be(inspection.Id);
        retrieved.CheckpointId.Should().Be(checkpoint.Id);
        retrieved.Status.Should().Be(InspectionStatus.Planned);
        retrieved.Result.Should().Be(InspectionResult.Pending);
    }

    /// <summary>
    /// Test Scenario 4: FSM state transition (Planned → InProgress → Completed)
    /// Verifies state machine enforcement and failure note handling.
    /// </summary>
    [Fact]
    public async Task InspectionRepository_CanTransitionInspectionState()
    {
        // Arrange
        var context = _fixture.CreateContext();
        var tenantId = Guid.NewGuid();

        var checkpoint = QACheckpoint.Create(
            tenantId,
            "Surface Quality",
            CheckpointType.InProcess,
            CriticalLevel.Critical);
        var checkpointRepo = new QACheckpointRepository(context);
        await checkpointRepo.AddAsync(checkpoint);

        var inspection = Inspection.Create(
            tenantId,
            checkpoint.Id,
            Guid.NewGuid(),
            DateTime.UtcNow);
        var inspectionRepo = new InspectionRepository(context);
        await inspectionRepo.AddAsync(inspection);

        // Act - State transition: Planned → InProgress
        inspection.Start();
        await inspectionRepo.UpdateAsync(inspection);

        var afterStart = await inspectionRepo.GetByIdAsync(inspection.Id, tenantId);
        afterStart!.Status.Should().Be(InspectionStatus.InProgress);

        // Act - State transition: InProgress → Completed (with fail)
        var failureNotes = new List<FailureNote>
        {
            FailureNote.Create(FailureType.Scratch, "Scratch found on upper right corner, approximately 2cm long", "defect.jpg")
        };
        inspection.CompleteWithFail(failureNotes, "Surface quality issue detected");
        await inspectionRepo.UpdateAsync(inspection);

        // Assert
        var afterComplete = await inspectionRepo.GetByIdAsync(inspection.Id, tenantId);
        afterComplete!.Status.Should().Be(InspectionStatus.Completed);
        afterComplete.Result.Should().Be(InspectionResult.Fail);
        afterComplete.FailureNotes.Should().HaveCount(1);
        afterComplete.FailureNotes!.First().FailureType.Should().Be(FailureType.Scratch);
    }

    /// <summary>
    /// Test Scenario 5: Multi-tenancy isolation (3-param pattern validation)
    /// Verifies that tenant filtering works correctly and prevents cross-tenant data leakage.
    /// </summary>
    [Fact]
    public async Task MultiTenant_CheckpointsFromDifferentTenants()
    {
        // Arrange
        var context = _fixture.CreateContext();
        var tenant1 = Guid.NewGuid();
        var tenant2 = Guid.NewGuid();

        var checkpoint1 = QACheckpoint.Create(tenant1, "Tenant1 Checkpoint", CheckpointType.Incoming, CriticalLevel.Critical);
        var checkpoint2 = QACheckpoint.Create(tenant2, "Tenant2 Checkpoint", CheckpointType.Final, CriticalLevel.Minor);

        var repository = new QACheckpointRepository(context);
        await repository.AddAsync(checkpoint1);
        await repository.AddAsync(checkpoint2);

        // Act - Retrieve checkpoints for each tenant
        var tenant1Checkpoints = await repository.GetActiveCheckpointsAsync(tenant1);
        var tenant2Checkpoints = await repository.GetActiveCheckpointsAsync(tenant2);

        // Assert - Each tenant should only see their own checkpoints
        tenant1Checkpoints.Should().HaveCount(1);
        tenant1Checkpoints.First().Id.Should().Be(checkpoint1.Id);
        tenant1Checkpoints.First().Name.Should().Be("Tenant1 Checkpoint");

        tenant2Checkpoints.Should().HaveCount(1);
        tenant2Checkpoints.First().Id.Should().Be(checkpoint2.Id);
        tenant2Checkpoints.First().Name.Should().Be("Tenant2 Checkpoint");

        // Act - Verify tenant isolation: trying to retrieve T1 checkpoint with T2 tenant should return null
        var wrongTenant = await repository.GetByIdAsync(checkpoint1.Id, tenant2);
        wrongTenant.Should().BeNull();
    }
}
