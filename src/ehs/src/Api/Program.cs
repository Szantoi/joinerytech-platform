using SpaceOS.Modules.Ehs.Api;
using SpaceOS.Modules.Ehs.Api.Endpoints;
using SpaceOS.Modules.Ehs.Application.Wire;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Authorization;
using SpaceOS.Modules.Hosting.Tenancy;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Enums travel as strings in the canonical Hungarian wire vocabulary (ADR-059, EhsWire —
// e.g. Severity: "sulyos", RiskStatus: "piszkozat"; matches docs/openapi.yaml). Unknown key
// → JsonException → 400. JsonStringEnumConverter stays LAST as fallback for any enum
// without an explicit map (kontrolling pattern), keeping "enums as strings" intact.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.AddEhsWireConverters();
    options.SerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter());
});

// Shared module-host auth (ADR-061): Keycloak JWT bearer from the Jwt section, kernel-parity
// wiring, fail-fast configuration. The pre-ADR host ran with NO authentication at all.
builder.Services.AddSpaceOsModuleAuth(builder.Configuration, builder.Environment);
builder.Services.AddRequiredEnabledModulePolicy("spaceos.ehs");

// Add EHS module services (DbContext, Repositories, MediatR, Validators)
// — includes AddSpaceOsModuleTenancy (claims tenant context + RLS interceptor).
builder.Services.AddEhsModule(builder.Configuration);

builder.Services.AddHealthChecks();

var app = builder.Build();

// Configure the HTTP request pipeline
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

// Every business endpoint requires the signed, online-checked EHS entitlement.
var ehsEndpoints = app.MapGroup("").RequireEnabledModule("spaceos.ehs");
ehsEndpoints.MapIncidentEndpoints();
ehsEndpoints.MapRiskAssessmentEndpoints();
ehsEndpoints.MapTrainingRecordEndpoints();
ehsEndpoints.MapLocationEndpoints();
ehsEndpoints.MapHazardousMaterialEndpoints();
ehsEndpoints.MapPpeEndpoints();
ehsEndpoints.MapSafetyWalkEndpoints();
ehsEndpoints.MapCorrectiveActionEndpoints();

app.Run();
