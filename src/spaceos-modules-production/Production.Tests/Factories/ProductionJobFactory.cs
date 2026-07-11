using SpaceOS.Modules.Production.Domain.ProductionJobs;

namespace Production.Tests.Factories;

/// <summary>
/// Factory for creating test ProductionJob instances.
/// </summary>
public static class ProductionJobFactory
{
    /// <summary>
    /// Creates a ProductionJob with default 6-stage workflow.
    /// </summary>
    public static ProductionJob CreateDefault(
        Guid? orderId = null,
        Guid? customerId = null,
        string? projectName = null,
        DateTimeOffset? deadline = null)
    {
        return ProductionJob.Create(
            orderId: orderId ?? Guid.NewGuid(),
            customerId: customerId ?? Guid.NewGuid(),
            projectName: projectName ?? "TEST-PROJECT",
            deadline: deadline ?? DateTimeOffset.UtcNow.AddDays(30)
        );
    }

    /// <summary>
    /// Creates a ProductionJob with Doorstar-specific configuration.
    /// </summary>
    public static ProductionJob CreateDoorstarJob(
        Guid orderId,
        Guid? customerId = null,
        string projectName = "DSMR 26144")
    {
        return ProductionJob.Create(
            orderId: orderId,
            customerId: customerId ?? Guid.NewGuid(),
            projectName: projectName,
            deadline: DateTimeOffset.UtcNow.AddDays(30)
        );
    }
}
