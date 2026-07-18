using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.Kontrolling.Api;
using SpaceOS.Modules.Kontrolling.Api.Endpoints;

// Runnable host for the Kontrolling module (EHS Api Program.cs precedent).
// The module itself carries the domain, the read model and the endpoints; this
// process only composes and serves them.

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Shared module-host auth (ADR-061): the interim DevelopmentAuthentication was lifted
// into SpaceOS.Modules.Hosting — Keycloak JWT bearer in production (Jwt:Authority +
// Jwt:Audience, fail-fast), Jwt:Mode=Development for local runs (refuses to start
// outside the Development environment, kontrolling precedent preserved).
builder.Services.AddSpaceOsModuleAuth(builder.Configuration, builder.Environment);

// DbContext, repositories, MediatR, validators, the configured thresholds,
// the project source and the JSON wire format (enums as strings).
// Misconfiguration throws here, at startup.
builder.Services.AddKontrollingModule(builder.Configuration);

builder.Services.AddHealthChecks();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
// Tenant from the JWT; X-Tenant-Id only as allowlist-validated selection (ADR-061 T1).
app.UseSpaceOsModuleTenancy();

app.MapHealthChecks("/health").AllowAnonymous();

app.MapKontrollingEndpoints();

app.Run();

/// <summary>
/// Exposed so endpoint tests can host the real composition root through
/// <c>WebApplicationFactory</c>.
/// </summary>
public partial class Program;
