using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Projects.Infrastructure.Data;
using Xunit;

namespace SpaceOS.Projects.IntegrationTests;

/// <summary>
/// The create path, end to end through the REAL host (PROJ-06's root gate): the deploy-shaped
/// wiring — Development auth issuing the synthetic tenant, the ADR-067 module gate, the tenancy
/// middleware, the idempotency middleware over the real store, the code allocator's single
/// atomic statement, the RLS session interceptor — against a genuine PostgreSQL, connected as
/// the NOSUPERUSER application role.
/// </summary>
/// <remarks>
/// <para>
/// <b>Deploy-shaped on purpose:</b> migrations run as the admin (migrator) role in the fixture,
/// the host runs with <c>MigrateOnStartup=false</c> on the application role — the same division
/// a VPS deployment has. A host that migrated as its runtime role would be proving a shape
/// production never runs.
/// </para>
/// <para>
/// The suite is serialised (xunit.runner.json) and each fixture owns its container; nothing here
/// touches another test's database.
/// </para>
/// </remarks>
public sealed class CreatePathEndToEndTests : IAsyncLifetime
{
    private const string Base = "/api/projects/v1/projects";

    private readonly NonSuperuserRlsFixture _fixture = new("projects_create_e2e");
    private WebApplicationFactory<Program> _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            // Migrate as the admin role — the migrator's job, not the runtime's.
            var options = new DbContextOptionsBuilder<ProjectsDbContext>()
                .UseNpgsql(_fixture.AdminConnectionString)
                .Options;
            await using (var context = new ProjectsDbContext(options))
            {
                await context.Database.MigrateAsync();
            }

            await _fixture.CreateApplicationRoleAsync(ProjectsDbContext.SchemaName);

            _factory = new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    builder.UseSetting("environment", "Development");
                    builder.ConfigureAppConfiguration((_, config) =>
                        config.AddInMemoryCollection(new Dictionary<string, string?>
                        {
                            ["ConnectionStrings:ProjectsDatabase"] = _fixture.AppConnectionString(),
                            ["Projects:Database:MigrateOnStartup"] = "false",
                            ["Projects:Kernel:BaseUrl"] = "http://kernel.invalid"
                        }));
                });

            _client = _factory.CreateClient();
        }
        catch
        {
            await _fixture.DisposeAsync();
            throw;
        }
    }

    public async Task DisposeAsync()
    {
        _client?.Dispose();
        if (_factory is not null)
        {
            await _factory.DisposeAsync();
        }

        await _fixture.DisposeAsync();
    }

    [Fact]
    public async Task Create_retry_and_list_through_the_real_pipeline()
    {
        // 1. Create, keyed. The Development identity carries the tenant and the module
        //    entitlement (appsettings.Development.json), so the gate opens for it.
        var create = new HttpRequestMessage(HttpMethod.Post, Base)
        {
            Content = JsonContent.Create(new { name = "E2E konyha" })
        };
        create.Headers.Add("Idempotency-Key", "e2e-key-1");

        var created = await _client.SendAsync(create);

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal("W/\"1\"", created.Headers.ETag?.ToString());

        var createdBody = await created.Content.ReadAsStringAsync();
        using (var body = JsonDocument.Parse(createdBody))
        {
            // The real allocator's first answer for this tenant and year — the single
            // INSERT … ON CONFLICT … RETURNING statement, through the app role, under RLS.
            Assert.Equal("PRJ-2026-001", body.RootElement.GetProperty("code").GetString());
            Assert.Equal("draft", body.RootElement.GetProperty("status").GetString());
        }

        // 2. Retry under the same key: replayed from the durable store, not created again.
        var retry = new HttpRequestMessage(HttpMethod.Post, Base)
        {
            Content = JsonContent.Create(new { name = "E2E konyha" })
        };
        retry.Headers.Add("Idempotency-Key", "e2e-key-1");

        var replayed = await _client.SendAsync(retry);

        Assert.Equal(HttpStatusCode.Created, replayed.StatusCode);
        Assert.Equal("true", replayed.Headers.GetValues("Idempotency-Replayed").Single());
        Assert.Equal(createdBody, await replayed.Content.ReadAsStringAsync());

        // 3. The list shows exactly one project — the replay really did not create a second one,
        //    and the second code was not burned.
        var list = await _client.GetAsync(Base);
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);

        using var listBody = JsonDocument.Parse(await list.Content.ReadAsStringAsync());
        var row = Assert.Single(listBody.RootElement.EnumerateArray());
        Assert.Equal("PRJ-2026-001", row.GetProperty("code").GetString());

        // 4. A second keyed create allocates the NEXT code — the counter moved exactly once
        //    for the replayed pair.
        var second = new HttpRequestMessage(HttpMethod.Post, Base)
        {
            Content = JsonContent.Create(new { name = "E2E fürdő" })
        };
        second.Headers.Add("Idempotency-Key", "e2e-key-2");

        var secondResponse = await _client.SendAsync(second);
        Assert.Equal(HttpStatusCode.Created, secondResponse.StatusCode);

        using var secondBody = JsonDocument.Parse(await secondResponse.Content.ReadAsStringAsync());
        Assert.Equal("PRJ-2026-002", secondBody.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task The_health_probe_of_the_real_host_answers_status_and_nothing_else()
    {
        // The S2 contract, measured on THIS host the day it is born: `{ status }`, no module id,
        // no version, no migrations assembly — and anonymously reachable.
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var property = Assert.Single(body.RootElement.EnumerateObject());
        Assert.Equal("status", property.Name);
    }
}
