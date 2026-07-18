using SpaceOS.Modules.CRM.Api;
using SpaceOS.Modules.CRM.Api.Endpoints;
using SpaceOS.Modules.CRM.Infrastructure;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tenancy;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Enums travel as strings on the wire (EHS Program.cs precedent)
builder.Services.AddCrmApiJsonOptions();

// CRM module: DbContext, repositories, MediatR handlers, validators, CrmOptions
builder.Services.AddCrmModule(builder.Configuration);

// Shared module-host auth (ADR-061). The previous scheme-less AddAuthentication() +
// RequireAuthorization() combination made EVERY request die with
// "No authenticationScheme was specified" — the host was unusable, even in Development.
builder.Services.AddSpaceOsModuleAuth(builder.Configuration, builder.Environment);

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

// Map CRM endpoints
app.MapLeadEndpoints();
app.MapOpportunityEndpoints();
app.MapCrmTaskEndpoints();

app.Run();

/// <summary>
/// Exposed so the endpoint tests can reference the host assembly
/// (WebApplicationFactory&lt;Program&gt;).
/// </summary>
public partial class Program;
