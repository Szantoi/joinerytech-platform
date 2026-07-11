using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.JoineryTech.Application.Contracts;
using SpaceOS.Modules.JoineryTech.Application.Data;
using SpaceOS.Modules.JoineryTech.Infrastructure.Auth;
using SpaceOS.Modules.JoineryTech.Api.Endpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Http;
using InfraDbContext = SpaceOS.Modules.JoineryTech.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// HTTP Context Accessor (needed for tenant context injection)
builder.Services.AddHttpContextAccessor();

// Database with tenant context interceptor
builder.Services.AddScoped<InfraDbContext.TenantDbConnectionInterceptor>();
builder.Services.AddDbContext<JoineryTechDbContext>((serviceProvider, options) =>
{
    var interceptor = serviceProvider.GetRequiredService<InfraDbContext.TenantDbConnectionInterceptor>();
    options.UseNpgsql(builder.Configuration.GetConnectionString("JoineryTech") ?? "Host=localhost;Database=joinerytech_dev;Username=spaceos;Password=spaceos")
           .AddInterceptors(interceptor);
});

// MediatR (CQRS)
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(SpaceOS.Modules.JoineryTech.Application.Auth.Commands.LoginCommand).Assembly);
});

// Authentication services
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();

// JWT Authentication
var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new ECDsaSecurityKey(ecdsa),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "joinerytech-api",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "joinerytech-client",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

// Map endpoints
app.MapAuthEndpoints();

app.Run();
