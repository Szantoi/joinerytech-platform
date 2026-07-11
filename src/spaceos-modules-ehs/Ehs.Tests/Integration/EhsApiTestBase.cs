// Ehs.Tests/Integration/EhsApiTestBase.cs

using Ehs.Application.Common;
using Ehs.Domain.Interfaces;
using Ehs.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Testcontainers.PostgreSql;
using Xunit;

namespace Ehs.Tests.Integration;

/// <summary>
/// Base class for EHS API integration tests with Testcontainers PostgreSQL.
/// </summary>
public abstract class EhsApiTestBase : IAsyncLifetime
{
    protected WebApplicationFactory<Program> Factory = null!;
    protected HttpClient Client = null!;
    private PostgreSqlContainer _postgresContainer = null!;

    public async Task InitializeAsync()
    {
        // 1. Start PostgreSQL container
        _postgresContainer = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("ehs_test")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();

        await _postgresContainer.StartAsync().ConfigureAwait(false);

        // 2. Create WebApplicationFactory with test database
        Factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Remove production DbContext
                    services.RemoveAll<DbContextOptions<EhsDbContext>>();

                    // Add test DbContext with Testcontainers connection string
                    services.AddDbContext<EhsDbContext>(options =>
                        options.UseNpgsql(_postgresContainer.GetConnectionString()));

                    // Disable authentication for integration tests
                    services.AddAuthentication("Test")
                        .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, TestAuthHandler>("Test", options => { });

                    // Mock S3Service (presigned URL generation)
                    var mockS3Service = new Mock<IS3Service>();
                    mockS3Service
                        .Setup(s => s.GeneratePresignedUploadUrlAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<long>()))
                        .ReturnsAsync(("https://s3.amazonaws.com/test-bucket/upload", "incidents/test-key.jpg", DateTimeOffset.UtcNow.AddMinutes(15)));
                    services.RemoveAll<IS3Service>();
                    services.AddSingleton(mockS3Service.Object);

                    // Mock CurrentUserContext (tenant + user ID)
                    var mockUserContext = new Mock<ICurrentUserContext>();
                    mockUserContext.Setup(c => c.TenantId).Returns(Guid.NewGuid());
                    mockUserContext.Setup(c => c.UserId).Returns(Guid.NewGuid());
                    services.RemoveAll<ICurrentUserContext>();
                    services.AddSingleton(mockUserContext.Object);

                    // Build ServiceProvider and run migrations
                    var sp = services.BuildServiceProvider();
                    using var scope = sp.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<EhsDbContext>();
                    db.Database.Migrate();
                });
            });

        // 3. Create HTTP client
        Client = Factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        await _postgresContainer.DisposeAsync().ConfigureAwait(false);
        Factory?.Dispose();
        Client?.Dispose();
    }
}
