using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Api;
using SpaceOS.Collaboration.Infrastructure;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tenancy;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Shared module-host auth (ADR-061): Keycloak JWT bearer, kernel-parity wiring, fail-fast config.
builder.Services.AddSpaceOsModuleAuth(builder.Configuration, builder.Environment);

// HTTP surface + application layer (caller context, module gate, ProblemDetails).
builder.Services.AddCollaborationApi();

// Persistence with the shared tenant session interceptor + repositories (ADR-062).
builder.Services.AddCollaborationInfrastructure(builder.Configuration);

var app = builder.Build();

// Config-driven, default OFF: applying migrations is an operations decision, not a side effect of
// a deployment restarting.
if (app.Configuration.GetValue("Collaboration:Database:MigrateOnStartup", false))
{
    using var scope = app.Services.CreateScope();
    var database = scope.ServiceProvider.GetRequiredService<CollaborationDbContext>();
    app.Logger.LogInformation("Collaboration host: applying pending migrations (Collaboration:Database:MigrateOnStartup=true)");
    database.Database.Migrate();
}

// Must come first so that every failure below leaves as RFC 7807 with a correlation id.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();
// Tenant from the JWT; X-Tenant-Id only as an allowlist-validated selection (ADR-061 T1).
app.UseSpaceOsModuleTenancy();

// After tenancy on purpose: idempotency keys are scoped per tenant (B2B-10 F3/3).
app.UseCollaborationIdempotency();

app.MapCollaborationEndpoints();

// Liveness only — deliberately anonymous and deliberately saying nothing about tenants.
app.MapGet("/health", () => Results.Ok(new { status = "ok", module = CollaborationApiExtensions.ModuleId }))
    .WithName("Health")
    .WithTags("Health")
    .AllowAnonymous();

app.Logger.LogInformation(
    "Collaboration API host started — endpoints mapped under {RouteBase}", CollaborationApiExtensions.RouteBase);

app.Run();

/// <summary>Exposed so an integration test can boot the real host (B2B-10 F3/5).</summary>
public partial class Program;
