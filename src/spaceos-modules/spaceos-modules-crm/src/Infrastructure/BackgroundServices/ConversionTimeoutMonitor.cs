using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.CRM.Application.Interfaces;

namespace SpaceOS.Modules.CRM.Infrastructure.BackgroundServices;

/// <summary>
/// Background service that monitors stuck Opportunity conversions (ADR-063)
/// Auto-rollbacks conversions that exceed 30 seconds timeout
/// </summary>
public class ConversionTimeoutMonitor : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ConversionTimeoutMonitor> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromSeconds(10);
    private readonly TimeSpan _timeout = TimeSpan.FromSeconds(30);

    public ConversionTimeoutMonitor(
        IServiceProvider serviceProvider,
        ILogger<ConversionTimeoutMonitor> logger)
    {
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ConversionTimeoutMonitor started (ADR-063)");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckTimeoutsAsync(stoppingToken).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking conversion timeouts");
            }

            await Task.Delay(_checkInterval, stoppingToken).ConfigureAwait(false);
        }

        _logger.LogInformation("ConversionTimeoutMonitor stopped");
    }

    /// <summary>
    /// Check for stuck conversions and rollback if timeout exceeded
    /// </summary>
    internal async Task CheckTimeoutsAsync(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IOpportunityRepository>();

        // Find opportunities in Converting state older than 30 seconds
        var stuckConversions = await repository
            .GetConvertingOpportunitiesOlderThanAsync(_timeout, ct)
            .ConfigureAwait(false);

        foreach (var opportunity in stuckConversions)
        {
            _logger.LogWarning(
                "Rolling back stuck conversion: OpportunityId={OpportunityId}, ConversionId={ConversionId}, StartedAt={StartedAt}",
                opportunity.Id,
                opportunity.ConversionId,
                opportunity.ConversionStartedAt);

            opportunity.RollbackConversion("Timeout (30s exceeded)");

            await repository.SaveChangesAsync(ct).ConfigureAwait(false);
        }

        if (stuckConversions.Any())
        {
            _logger.LogInformation("Rolled back {Count} stuck conversions", stuckConversions.Count());
        }
    }
}
