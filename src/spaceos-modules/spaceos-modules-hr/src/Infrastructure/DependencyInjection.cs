using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.HR.Application.EventHandlers;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Infrastructure.Data;
using SpaceOS.Modules.HR.Infrastructure.Repositories;

namespace SpaceOS.Modules.HR.Infrastructure;

/// <summary>
/// HR Module dependency injection registration.
/// Registers DbContext, Repositories, and MediatR event handlers.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers HR module services.
    /// </summary>
    public static IServiceCollection AddHrModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // DbContext registration
        services.AddDbContext<HrDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("HrDatabase")
                ?? throw new InvalidOperationException("HrDatabase connection string not found");

            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__ef_migrations_history", "hr");
            });
        });

        // Repository registration
        services.AddScoped<IEmployeeRepository, EmployeeRepository>();

        // MediatR event handlers (auto-registration from assembly)
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(TrainingCompletedEventHandler).Assembly);
        });

        return services;
    }
}
