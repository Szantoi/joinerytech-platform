// Ehs.Infrastructure/DependencyInjection.cs

using Amazon.S3;
using Ehs.Application.Common;
using Ehs.Domain.Interfaces;
using Ehs.Infrastructure.Data;
using Ehs.Infrastructure.Repositories;
using Ehs.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Ehs.Infrastructure;

/// <summary>
/// Dependency injection extensions for EHS Infrastructure layer.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddEhsInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Database
        var connectionString = configuration.GetConnectionString("EhsDb")
            ?? throw new InvalidOperationException("EhsDb connection string not found.");

        services.AddDbContext<EhsDbContext>(options =>
            options.UseNpgsql(connectionString));

        // Repositories
        services.AddScoped<IEhsEventRepository, EhsEventRepository>();

        // S3 Service
        var s3BucketName = configuration["AWS:S3:EhsPhotosBucket"]
            ?? throw new InvalidOperationException("AWS S3 bucket name not configured.");

        services.AddSingleton<IAmazonS3>(sp => new AmazonS3Client());
        services.AddScoped<IS3Service>(sp => new S3Service(
            sp.GetRequiredService<IAmazonS3>(),
            s3BucketName));

        // User Context
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserContext, CurrentUserContextService>();

        return services;
    }
}
