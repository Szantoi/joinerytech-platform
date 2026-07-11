using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Production.Domain.Abstractions;
using SpaceOS.Modules.Production.Infrastructure.Persistence;
using SpaceOS.Modules.Production.Infrastructure.Persistence.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Register Production module services
builder.Services.AddDbContext<ProductionDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("ProductionDb"));
});

builder.Services.AddScoped<IProductionJobRepository, ProductionJobRepository>();

var app = builder.Build();

// Configure pipeline
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
