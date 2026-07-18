using FluentValidation;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.QA.Api;
using SpaceOS.Modules.QA.Api.Endpoints;
using SpaceOS.Modules.QA.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Enums travel as strings in the ADR-059 Hungarian wire vocabulary (QaWire);
// JsonStringEnumConverter stays as the last-resort fallback inside the extension.
builder.Services.AddQaApiJsonOptions();

// Shared module-host auth + tenancy (ADR-061): Keycloak JWT bearer, fail-fast config;
// the QA module previously had NO runnable host at all.
builder.Services.AddSpaceOsModuleAuth(builder.Configuration, builder.Environment);

// QA module services (DbContext + shared RLS interceptor, repositories, MediatR).
builder.Services.AddQAInfrastructure(builder.Configuration);
builder.Services.AddQAApplication();

// Command validators from the module assembly (host responsibility per module note).
builder.Services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

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
// QA endpoints keep their [FromHeader] X-Tenant-Id parameters as transport — this
// middleware guarantees the header matches the token before any endpoint runs.
app.UseSpaceOsModuleTenancy();

app.MapHealthChecks("/health").AllowAnonymous();

// QA endpoints (all groups RequireAuthorization-gated in the module).
app.MapQACheckpointEndpoints();
app.MapInspectionEndpoints();
app.MapTicketEndpoints();
app.MapQAMetricsEndpoints();

app.Run();
