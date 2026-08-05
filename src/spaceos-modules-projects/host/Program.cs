using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Modules;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Projects.Api;
using SpaceOS.Projects.Infrastructure;
using SpaceOS.Projects.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ADR-061: shared Keycloak/dev auth, tenant from the JWT, fail-closed without configuration.
builder.Services.AddSpaceOsModuleAuth(builder.Configuration, builder.Environment);

// The API layer (ProblemDetails, module gate, Kernel-backed epic resolver) and the persistence
// (DbContext + ADR-062 RLS session interceptor). The host is the only place the two meet.
builder.Services.AddProjectsApi(builder.Configuration);
builder.Services.AddProjectsPersistence(builder.Configuration);

// MapModuleHealth resolves HealthCheckService; the probe stays `{ status }`-only (S2).
builder.Services.AddHealthChecks();

var app = builder.Build();

// Config-driven, default OFF: an ops decision, not something a deploy inherits by accident.
if (app.Configuration.GetValue("Projects:Database:MigrateOnStartup", false))
{
    using var scope = app.Services.CreateScope();
    var database = scope.ServiceProvider.GetRequiredService<ProjectsDbContext>();
    database.Database.Migrate();
}

// First, so every failure below leaves as RFC 7807 with a correlation id.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// After authentication: the tenant comes from the validated token, never from a bare header.
app.UseSpaceOsModuleTenancy();

// After tenancy: idempotency keys are scoped per tenant.
app.UseProjectsIdempotency();

app.MapProjectsEndpoints();

// Anonymous liveness probe, `{ status }` and nothing else (S2: no module id, no version, no
// migrations assembly on an unauthenticated surface).
app.MapModuleHealth();

app.Run();

/// <summary>Boots the real pipeline from integration tests.</summary>
public partial class Program;
