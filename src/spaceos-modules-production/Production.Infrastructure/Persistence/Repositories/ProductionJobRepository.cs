using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Production.Domain.Abstractions;
using SpaceOS.Modules.Production.Domain.ProductionJobs;
using SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

namespace SpaceOS.Modules.Production.Infrastructure.Persistence.Repositories;

/// <summary>
/// ProductionJob repository implementation (EF Core)
/// </summary>
public class ProductionJobRepository : IProductionJobRepository
{
    private readonly ProductionDbContext _context;

    public ProductionJobRepository(ProductionDbContext context)
    {
        _context = context;
    }

    public async Task<ProductionJob?> GetByIdAsync(ProductionJobId id, CancellationToken ct = default)
    {
        return await _context.ProductionJobs
            .Include(j => j.Steps)
            .FirstOrDefaultAsync(j => j.Id == id, ct)
            .ConfigureAwait(false);
    }

    public async Task<ProductionJob?> GetByOrderIdAsync(Guid orderId, CancellationToken ct = default)
    {
        return await _context.ProductionJobs
            .Include(j => j.Steps)
            .FirstOrDefaultAsync(j => j.OrderId == orderId, ct)
            .ConfigureAwait(false);
    }

    public async Task<List<ProductionJob>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.ProductionJobs
            .Include(j => j.Steps)
            .AsNoTracking()
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<List<ProductionJob>> FindByAssetIdAsync(Guid assetId, CancellationToken ct = default)
    {
        return await _context.ProductionJobs
            .Include(j => j.Steps)
            .Where(j => j.AssetId == assetId)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(ProductionJob job, CancellationToken ct = default)
    {
        await _context.ProductionJobs.AddAsync(job, ct).ConfigureAwait(false);
    }

    public Task UpdateAsync(ProductionJob job, CancellationToken ct = default)
    {
        _context.ProductionJobs.Update(job);
        return Task.CompletedTask;
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
