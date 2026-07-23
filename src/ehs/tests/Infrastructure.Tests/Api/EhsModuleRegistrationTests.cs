using FluentValidation;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Ehs.Api;
using SpaceOS.Modules.Ehs.Application.Common.Behaviors;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.CreateRiskAssessment;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests.Api;

/// <summary>
/// DI pin for the PRODUCTION composition root. <see cref="EhsServiceCollectionExtensions.AddEhsModule"/>
/// must register the single shared <see cref="ValidationBehavior{TRequest,TResponse}"/> — without it the
/// Application validators are registered but never executed (the original P1 defect), while every
/// endpoint test that wires its own pipeline stays green. Descriptor scan only: no provider is built,
/// so the DbContext/tenancy registrations remain inert and no database or Docker is needed.
/// </summary>
public sealed class EhsModuleRegistrationTests
{
    private static ServiceCollection BuildEhsModuleServices()
    {
        // Connection string is only read lazily inside the AddDbContext factory;
        // provided anyway so the registration mirrors a real host configuration.
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:EhsDatabase"] = "Host=localhost;Database=ehs-di-pin",
            })
            .Build();

        var services = new ServiceCollection();
        services.AddEhsModule(configuration);
        return services;
    }

    [Fact]
    public void AddEhsModule_RegistersTheSharedValidationBehavior_ExactlyOnce()
    {
        var services = BuildEhsModuleServices();

        var validationBehaviors = services
            .Where(descriptor =>
                descriptor.ServiceType == typeof(IPipelineBehavior<,>) &&
                descriptor.ImplementationType == typeof(ValidationBehavior<,>))
            .ToList();

        Assert.Single(validationBehaviors);
    }

    [Fact]
    public void AddEhsModule_RegistersTheApplicationValidators()
    {
        var services = BuildEhsModuleServices();

        // One representative validator proves AddValidatorsFromAssembly scanned the
        // Application assembly — without it the pipeline behavior would silently no-op.
        Assert.Contains(services, descriptor =>
            descriptor.ServiceType == typeof(IValidator<CreateRiskAssessmentCommand>) &&
            descriptor.ImplementationType == typeof(CreateRiskAssessmentCommandValidator));
    }
}
