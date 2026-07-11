namespace SpaceOS.Modules.Kontrolling.Tests.Domain.Entities;

using FluentAssertions;
using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;
using Xunit;

public sealed class CostAdjustmentTests
{
    [Fact]
    public void Create_WithValidData_ShouldSucceed()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var amount = new Money(5000, "HUF");
        var createdBy = Guid.NewGuid();

        // Act
        var adjustment = CostAdjustment.Create(
            tenantId,
            projectId,
            CostCategory.Material,
            amount,
            AdjustmentScope.Project,
            "Incorrect material invoice",
            createdBy);

        // Assert
        adjustment.Should().NotBeNull();
        adjustment.AdjustmentId.Should().NotBeEmpty();
        adjustment.TenantId.Should().Be(tenantId);
        adjustment.ProjectId.Should().Be(projectId);
        adjustment.Category.Should().Be(CostCategory.Material);
        adjustment.Amount.Should().Be(amount);
        adjustment.Scope.Should().Be(AdjustmentScope.Project);
        adjustment.Reason.Should().Be("Incorrect material invoice");
        adjustment.CreatedBy.Should().Be(createdBy);
        adjustment.IsDeleted.Should().BeFalse();
    }

    [Fact]
    public void Create_ProjectScope_WithoutProjectId_ShouldThrow()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var amount = new Money(5000, "HUF");
        var createdBy = Guid.NewGuid();

        // Act & Assert
        var act = () => CostAdjustment.Create(
            tenantId,
            null, // Missing project ID
            CostCategory.Material,
            amount,
            AdjustmentScope.Project,
            "Test reason",
            createdBy);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("ProjectId is required for project-scoped adjustments");
    }

    [Fact]
    public void Create_PortfolioScope_WithProjectId_ShouldThrow()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var amount = new Money(5000, "HUF");
        var createdBy = Guid.NewGuid();

        // Act & Assert
        var act = () => CostAdjustment.Create(
            tenantId,
            projectId, // Should be null for portfolio
            CostCategory.Material,
            amount,
            AdjustmentScope.Portfolio,
            "Test reason",
            createdBy);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("ProjectId must be null for portfolio-scoped adjustments");
    }

    [Fact]
    public void Create_WithEmptyReason_ShouldThrow()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var amount = new Money(5000, "HUF");
        var createdBy = Guid.NewGuid();

        // Act & Assert
        var act = () => CostAdjustment.Create(
            tenantId,
            projectId,
            CostCategory.Material,
            amount,
            AdjustmentScope.Project,
            "", // Empty reason
            createdBy);

        act.Should().Throw<ArgumentException>()
            .WithMessage("Reason is required for cost adjustment*");
    }

    [Fact]
    public void Create_WithZeroAmount_ShouldThrow()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var amount = Money.Zero("HUF");
        var createdBy = Guid.NewGuid();

        // Act & Assert
        var act = () => CostAdjustment.Create(
            tenantId,
            projectId,
            CostCategory.Material,
            amount,
            AdjustmentScope.Project,
            "Test reason",
            createdBy);

        act.Should().Throw<ArgumentException>()
            .WithMessage("Adjustment amount cannot be zero*");
    }

    [Fact]
    public void Delete_ShouldMarkAsDeleted()
    {
        // Arrange
        var adjustment = CostAdjustment.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            CostCategory.Material,
            new Money(5000, "HUF"),
            AdjustmentScope.Project,
            "Test reason",
            Guid.NewGuid());

        var deletedBy = Guid.NewGuid();

        // Act
        adjustment.Delete(deletedBy);

        // Assert
        adjustment.IsDeleted.Should().BeTrue();
        adjustment.DeletedBy.Should().Be(deletedBy);
        adjustment.DeletedAt.Should().NotBeNull();
        adjustment.DeletedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void Delete_AlreadyDeleted_ShouldThrow()
    {
        // Arrange
        var adjustment = CostAdjustment.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            CostCategory.Material,
            new Money(5000, "HUF"),
            AdjustmentScope.Project,
            "Test reason",
            Guid.NewGuid());

        adjustment.Delete(Guid.NewGuid());

        // Act & Assert
        var act = () => adjustment.Delete(Guid.NewGuid());
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Adjustment is already deleted");
    }

    [Fact]
    public void AppliesTo_ProjectScope_MatchingProject_ShouldReturnTrue()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var adjustment = CostAdjustment.Create(
            Guid.NewGuid(),
            projectId,
            CostCategory.Material,
            new Money(5000, "HUF"),
            AdjustmentScope.Project,
            "Test reason",
            Guid.NewGuid());

        // Act & Assert
        adjustment.AppliesTo(projectId).Should().BeTrue();
    }

    [Fact]
    public void AppliesTo_ProjectScope_DifferentProject_ShouldReturnFalse()
    {
        // Arrange
        var adjustment = CostAdjustment.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            CostCategory.Material,
            new Money(5000, "HUF"),
            AdjustmentScope.Project,
            "Test reason",
            Guid.NewGuid());

        var differentProjectId = Guid.NewGuid();

        // Act & Assert
        adjustment.AppliesTo(differentProjectId).Should().BeFalse();
    }

    [Fact]
    public void AppliesTo_PortfolioScope_ShouldReturnTrueForAnyProject()
    {
        // Arrange
        var adjustment = CostAdjustment.Create(
            Guid.NewGuid(),
            null, // Portfolio scope
            CostCategory.Material,
            new Money(5000, "HUF"),
            AdjustmentScope.Portfolio,
            "Test reason",
            Guid.NewGuid());

        // Act & Assert
        adjustment.AppliesTo(Guid.NewGuid()).Should().BeTrue();
        adjustment.AppliesTo(Guid.NewGuid()).Should().BeTrue();
    }

    [Fact]
    public void AppliesTo_DeletedAdjustment_ShouldReturnFalse()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var adjustment = CostAdjustment.Create(
            Guid.NewGuid(),
            projectId,
            CostCategory.Material,
            new Money(5000, "HUF"),
            AdjustmentScope.Project,
            "Test reason",
            Guid.NewGuid());

        adjustment.Delete(Guid.NewGuid());

        // Act & Assert
        adjustment.AppliesTo(projectId).Should().BeFalse();
    }

    [Theory]
    [InlineData(5000, true, false)]   // Positive = increase
    [InlineData(-3000, false, true)]  // Negative = decrease
    public void IsIncrease_IsDecrease_ShouldReflectAmount(
        decimal amount,
        bool expectedIncrease,
        bool expectedDecrease)
    {
        // Arrange
        var adjustment = CostAdjustment.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            CostCategory.Material,
            new Money(amount, "HUF"),
            AdjustmentScope.Project,
            "Test reason",
            Guid.NewGuid());

        // Assert
        adjustment.IsIncrease.Should().Be(expectedIncrease);
        adjustment.IsDecrease.Should().Be(expectedDecrease);
    }
}
