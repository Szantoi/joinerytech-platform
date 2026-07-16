using SpaceOS.Modules.CRM.Api;
using SpaceOS.Modules.CRM.Api.Endpoints;
using SpaceOS.Modules.CRM.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Enums travel as strings on the wire (EHS Program.cs precedent)
builder.Services.AddCrmApiJsonOptions();

// CRM module: DbContext, repositories, MediatR handlers, validators, CrmOptions
builder.Services.AddCrmModule(builder.Configuration);

builder.Services.AddAuthentication();
builder.Services.AddAuthorization();

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
