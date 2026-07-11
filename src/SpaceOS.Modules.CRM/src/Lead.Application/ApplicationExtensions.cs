using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.CRM.Application.Validators;

namespace SpaceOS.Modules.CRM.Application;

/// <summary>
/// Extension methods to register CRM Application layer services.
/// Called from Kernel/Orchestrator Program.cs in ConfigureServices.
/// </summary>
public static class ApplicationExtensions
{
    /// <summary>
    /// Add CRM application layer services:
    /// - MediatR handlers (auto-registered via assembly scan)
    /// - FluentValidation validators
    /// - Validation behavior pipeline
    /// </summary>
    public static IServiceCollection AddCrmApplication(this IServiceCollection services)
    {
        // Register MediatR handlers from this assembly
        services.AddMediatR(config =>
        {
            config.RegisterServicesFromAssembly(typeof(ApplicationExtensions).Assembly);
        });

        // Register FluentValidation validators
        services.AddValidatorsFromAssemblyContaining<CreateLeadCommandValidator>();

        // Add validation behavior (intercepts all commands before handler execution)
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        return services;
    }
}

/// <summary>
/// Validation pipeline behavior.
/// Executes FluentValidation on all commands before handler runs.
/// Returns validation errors without executing handler.
/// </summary>
public sealed class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var context = new ValidationContext<TRequest>(request);
        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken))
        ).ConfigureAwait(false);

        var failures = validationResults
            .Where(r => !r.IsValid)
            .SelectMany(r => r.Errors)
            .ToList();

        // If validation passed, continue to handler
        if (failures.Count == 0)
            return await next().ConfigureAwait(false);

        // If validation failed, throw exception
        // (Exception will be caught by global exception middleware)
        throw new ValidationException(
            $"Validation failed for {typeof(TRequest).Name}",
            failures);
    }
}
