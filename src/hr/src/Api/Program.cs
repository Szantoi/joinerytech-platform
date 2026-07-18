using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.HR.Api;
using SpaceOS.Modules.HR.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Enums travel as strings on the wire (EHS/QA Program precedent — e.g. AbsenceStatus:
// "Pending", Department: "Production"); integer values stay accepted on input.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter()));

// Shared module-host auth (ADR-061): the kernel-parity Keycloak wiring from
// SpaceOS.Modules.Hosting replaces the hand-copied (and already drifted) JWT block —
// the copy had lost the realm_access role mapping and the ProblemDetails 401/403.
builder.Services.AddSpaceOsModuleAuth(builder.Configuration, builder.Environment);

// Add HR module services (DbContext, Repositories, MediatR, capacity config, Validators,
// Hr:PayGrades options) — includes the shared tenancy registration.
builder.Services.AddHrModule(builder.Configuration);

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

// Map HR endpoints
app.MapEmployeeEndpoints();
app.MapAbsenceEndpoints();
app.MapCapacityEndpoints();

app.Run();
