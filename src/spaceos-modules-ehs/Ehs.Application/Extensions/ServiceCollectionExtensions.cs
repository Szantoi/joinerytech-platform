using Ehs.Application.Commands.CreateRiskAssessment;
using Ehs.Application.Queries.GetLatestRiskAssessment;
using Ehs.Application.Queries.GetRiskAssessmentHistory;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Ehs.Application.Extensions;

/// <summary>
/// Extension methods for registering EHS application services.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers EHS application layer services (handlers, validators).
    /// </summary>
    public static IServiceCollection AddEhsApplication(this IServiceCollection services)
    {
        // Register FluentValidation validators
        services.AddValidatorsFromAssemblyContaining<CreateRiskAssessmentValidator>();

        // Register command handlers
        services.AddScoped<CreateRiskAssessmentHandler>();

        // Register query handlers
        services.AddScoped<GetLatestRiskAssessmentHandler>();
        services.AddScoped<GetRiskAssessmentHistoryHandler>();

        return services;
    }
}
