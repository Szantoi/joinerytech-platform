using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
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

// Keycloak bearer auth — the endpoints are RequireAuthorization-gated, so the host must
// carry a real scheme (SpaceOS.Kernel.Api Program precedent; config: "Jwt:Authority" /
// "Jwt:Audience"). NOTE: this authenticates the caller only — the `hr.manage` permission
// gate on approve/reject is still a documented follow-up (HR-BE-HOST.md).
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Jwt:Authority"];
        options.Audience = builder.Configuration["Jwt:Audience"];
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "preferred_username",
            RoleClaimType = ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization();

// Add HR module services (DbContext, Repositories, MediatR, capacity config, Validators)
builder.Services.AddHrModule(builder.Configuration);

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

// Map HR endpoints
app.MapEmployeeEndpoints();
app.MapAbsenceEndpoints();
app.MapCapacityEndpoints();

app.Run();
