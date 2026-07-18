using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.DMS.Api;
using SpaceOS.Modules.DMS.Api.Endpoints;
using SpaceOS.Modules.DMS.Infrastructure.Persistence;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tenancy;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container (EHS Program.cs precedent)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Enums travel as the portal's canonical Hungarian wire keys (ADR-059, DmsWire maps:
// status "piszkozat"/"ellenorzes"/"kiadott"/"archivalt"; type "rajz"/…;
// linkType "project"/…; expiry "lejart"/"lejaro")
builder.Services.AddDmsApiJsonOptions();

// Shared module-host auth (ADR-061): Keycloak JWT bearer from the Jwt section, kernel-parity
// wiring, fail-fast configuration. The pre-ADR host ran with NO authentication at all.
builder.Services.AddSpaceOsModuleAuth(builder.Configuration, builder.Environment);

// DMS module services (shared tenancy + adapter, DbContext + RLS, repositories,
// blob store stub, expiry options, MediatR handlers)
builder.Services.AddDmsModule(builder.Configuration);

var app = builder.Build();

// Optional startup migration — CONFIG-DRIVEN (default off; ops decision)
if (app.Configuration.GetValue("Dms:Database:MigrateOnStartup", false))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<DMSDbContext>();
    app.Logger.LogInformation("DMS host: applying pending migrations (Dms:Database:MigrateOnStartup=true)");
    db.Database.Migrate();
}

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

// Map DMS endpoints (Document core — DMS-BE-HOST; the DocumentCategory/Tag
// slice is handler-ready, its endpoint layer is a separate task).
// Every business group is RequireAuthorization-gated (DocumentEndpoints).
app.MapDocumentEndpoints();

// Liveness probe (grounded "it runs" evidence — QUALITY.md 8.)
app.MapGet("/health", () => Results.Ok(new { status = "ok", module = "dms" }))
    .WithName("Health")
    .WithTags("Health")
    .AllowAnonymous();

app.Logger.LogInformation("DMS API host started — module endpoints mapped under /api/dms");

app.Run();
