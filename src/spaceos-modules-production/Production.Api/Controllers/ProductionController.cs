using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SpaceOS.Modules.Production.Application.ProductionJobs.Commands;
using SpaceOS.Modules.Production.Application.ProductionJobs.DTOs;
using SpaceOS.Modules.Production.Domain.Abstractions;
using SpaceOS.Modules.Production.Domain.ProductionJobs;
using SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

namespace SpaceOS.Modules.Production.Api.Controllers;

/// <summary>
/// Production workflow controller (6 endpoints)
/// </summary>
[ApiController]
[Route("api/production")]
[Authorize]
public class ProductionController : ControllerBase
{
    private readonly IProductionJobRepository _repository;

    public ProductionController(IProductionJobRepository repository)
    {
        _repository = repository;
    }

    /// <summary>
    /// GET /api/production/jobs - Műhelyvezető production queue
    /// </summary>
    [HttpGet("jobs")]
    public async Task<ActionResult<List<ProductionJobDto>>> GetQueue(CancellationToken ct)
    {
        var jobs = await _repository.GetAllAsync(ct);
        var dtos = jobs.Select(MapToDto).ToList();
        return Ok(dtos);
    }

    /// <summary>
    /// GET /api/production/jobs/{jobId} - Job detail
    /// </summary>
    [HttpGet("jobs/{jobId:guid}")]
    public async Task<ActionResult<ProductionJobDto>> GetJobById(Guid jobId, CancellationToken ct)
    {
        var job = await _repository.GetByIdAsync(ProductionJobId.From(jobId), ct);
        if (job == null)
            return NotFound();

        return Ok(MapToDto(job));
    }

    /// <summary>
    /// GET /api/production/overview - Tulaj/sales dashboard
    /// </summary>
    [HttpGet("overview")]
    public async Task<ActionResult<ProductionOverviewDto>> GetOverview(CancellationToken ct)
    {
        var jobs = await _repository.GetAllAsync(ct);
        var dtos = jobs.Select(MapToDto).ToList();

        var overview = new ProductionOverviewDto(
            ActiveJobs: dtos.Count(j => j.Status != "ShippingReady"),
            CompletedJobs: dtos.Count(j => j.Status == "ShippingReady"),
            OverdueJobs: dtos.Count(j => j.IsOverdue),
            ShippingReadyJobs: dtos.Count(j => j.Status == "ShippingReady"),
            ActiveProjects: dtos.Where(j => j.Status != "ShippingReady").ToList()
        );

        return Ok(overview);
    }

    /// <summary>
    /// PUT /api/production/jobs/{jobId}/steps/{stepName}/start - Start workflow step
    /// </summary>
    [HttpPut("jobs/{jobId:guid}/steps/{stepName}/start")]
    public async Task<IActionResult> StartStep(Guid jobId, string stepName, CancellationToken ct)
    {
        var job = await _repository.GetByIdAsync(ProductionJobId.From(jobId), ct);
        if (job == null)
            return NotFound();

        if (!Enum.TryParse<WorkflowStepName>(stepName, out var parsedStepName))
            return BadRequest($"Invalid step name: {stepName}");

        var result = job.StartStep(parsedStepName);
        if (result.IsFailure)
            return BadRequest(result.Error);

        await _repository.SaveChangesAsync(ct);
        return Ok();
    }

    /// <summary>
    /// PUT /api/production/jobs/{jobId}/steps/{stepName}/complete - Complete workflow step
    /// </summary>
    [HttpPut("jobs/{jobId:guid}/steps/{stepName}/complete")]
    public async Task<IActionResult> CompleteStep(
        Guid jobId,
        string stepName,
        [FromBody] CompleteStepRequest? request,
        CancellationToken ct)
    {
        var job = await _repository.GetByIdAsync(ProductionJobId.From(jobId), ct);
        if (job == null)
            return NotFound();

        if (!Enum.TryParse<WorkflowStepName>(stepName, out var parsedStepName))
            return BadRequest($"Invalid step name: {stepName}");

        var result = job.CompleteStep(parsedStepName, request?.PhotoUrl, "manual");
        if (result.IsFailure)
            return BadRequest(result.Error);

        await _repository.SaveChangesAsync(ct);
        return Ok();
    }

    /// <summary>
    /// PUT /api/production/jobs/{jobId}/mark-shipping-ready - Mark job as shipping ready (manual override)
    /// </summary>
    [HttpPut("jobs/{jobId:guid}/mark-shipping-ready")]
    public async Task<IActionResult> MarkAsShippingReady(Guid jobId, CancellationToken ct)
    {
        var job = await _repository.GetByIdAsync(ProductionJobId.From(jobId), ct);
        if (job == null)
            return NotFound();

        // Check if all steps are done
        if (job.Steps.Any(s => s.Status != WorkflowStepStatus.Done))
            return BadRequest("All workflow steps must be completed first");

        await _repository.SaveChangesAsync(ct);
        return Ok();
    }

    // Helper: Map domain entity to DTO
    private static ProductionJobDto MapToDto(ProductionJob job)
    {
        return new ProductionJobDto(
            JobId: job.Id.Value,
            OrderId: job.OrderId,
            ProjectName: job.ProjectName,
            Deadline: job.Deadline,
            Status: job.Status.ToString(),
            Steps: job.Steps.Select(s => new WorkflowStepDto(
                Name: s.Name.ToString(),
                Status: s.Status.ToString(),
                StartedAt: s.StartedAt,
                CompletedAt: s.CompletedAt,
                PhotoUrl: s.PhotoUrl,
                CompletedBy: s.CompletedBy
            )).ToList(),
            IsOverdue: job.Deadline < DateTimeOffset.UtcNow && job.Status != ProductionStatus.ShippingReady,
            CreatedAt: job.CreatedAt
        );
    }
}

/// <summary>
/// Request DTO for completing a step
/// </summary>
public record CompleteStepRequest(string? PhotoUrl);
