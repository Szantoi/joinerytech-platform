// Ehs.Api/Program.cs

using Ehs.Infrastructure;
using FluentValidation;
using MediatR;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// MediatR
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(Ehs.Application.Commands.ReportIncidentCommand).Assembly));

// FluentValidation
builder.Services.AddValidatorsFromAssembly(typeof(Ehs.Application.Commands.ReportIncidentCommandValidator).Assembly);

// EHS Infrastructure
builder.Services.AddEhsInfrastructure(builder.Configuration);

// JWT Authentication (placeholder - integrate with Kernel)
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Jwt:Authority"];
        options.Audience = builder.Configuration["Jwt:Audience"];
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Make Program class accessible to WebApplicationFactory (integration tests)
public partial class Program { }
