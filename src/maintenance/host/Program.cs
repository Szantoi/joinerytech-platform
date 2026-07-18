using FluentValidation;
using MediatR;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.Maintenance.Api;
using SpaceOS.Modules.Maintenance.Api.Endpoints;
using SpaceOS.Modules.Maintenance.Host;
using SpaceOS.Modules.Maintenance.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Enums travel as strings on the wire (module-provided converter, EHS precedent).
builder.Services.AddMaintenanceApiJsonOptions();

// Shared module-host auth + tenancy (ADR-061): Keycloak JWT bearer, fail-fast config;
// the Maintenance module previously had NO runnable host at all.
builder.Services.AddSpaceOsModuleAuth(builder.Configuration, builder.Environment);

// Maintenance module services (DbContext + shared RLS interceptor, repositories).
builder.Services.AddMaintenanceInfrastructure(builder.Configuration);

// MediatR handlers + FluentValidation command pipeline (host responsibility — the
// module ships handlers and validators only; wiring mirrors the module's test fixture).
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
});
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
app.UseSpaceOsModuleTenancy();

app.MapHealthChecks("/health").AllowAnonymous();

// Maintenance endpoints (both groups RequireAuthorization-gated in the module).
app.MapAssetEndpoints();
app.MapWorkOrderEndpoints();

app.Run();
