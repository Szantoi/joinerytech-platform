using SpaceOS.Modules.Ehs.Api;
using SpaceOS.Modules.Ehs.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add EHS module services (DbContext, Repositories, MediatR, AutoMapper, Validators)
builder.Services.AddEhsModule(builder.Configuration);

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Map EHS endpoints
app.MapIncidentEndpoints();
app.MapRiskAssessmentEndpoints();
app.MapTrainingRecordEndpoints();

app.Run();
