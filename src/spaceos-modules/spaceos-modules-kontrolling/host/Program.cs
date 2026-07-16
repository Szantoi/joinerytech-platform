using SpaceOS.Modules.Kontrolling.Api;
using SpaceOS.Modules.Kontrolling.Api.Endpoints;
using SpaceOS.Modules.Kontrolling.Host;

// Runnable host for the Kontrolling module (EHS Api Program.cs precedent).
// The module itself carries the domain, the read model and the endpoints; this
// process only composes and serves them.

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// The endpoints require an authenticated caller, but the platform has no
// shared authentication wiring for module hosts yet (no module registers a
// scheme; the kernel ships no handler) — see DevelopmentAuthentication and the
// open decision in the task doc. Until that is settled, only the development
// scheme exists, and it refuses to start outside Development.
builder.Services.AddDevelopmentAuthentication(builder.Environment);
builder.Services.AddAuthorization();

// DbContext, repositories, MediatR, validators, the configured thresholds,
// the project source and the JSON wire format (enums as strings).
// Misconfiguration throws here, at startup.
builder.Services.AddKontrollingModule(builder.Configuration);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapKontrollingEndpoints();

app.Run();

/// <summary>
/// Exposed so endpoint tests can host the real composition root through
/// <c>WebApplicationFactory</c>.
/// </summary>
public partial class Program;
