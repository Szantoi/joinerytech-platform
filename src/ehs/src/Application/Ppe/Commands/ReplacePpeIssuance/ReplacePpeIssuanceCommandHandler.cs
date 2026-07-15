using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.ReplacePpeIssuance;

/// <summary>
/// Handler for ReplacePpeIssuanceCommand.
/// The aggregate spawns the replacement issuance; the repository persists the
/// pair (old update + new insert) in a single SaveChanges.
/// Not-found → KeyNotFoundException (404); illegal transition → InvalidOperationException (409).
/// </summary>
public class ReplacePpeIssuanceCommandHandler : IRequestHandler<ReplacePpeIssuanceCommand, Guid>
{
    private readonly IPpeIssuanceRepository _repository;

    public ReplacePpeIssuanceCommandHandler(IPpeIssuanceRepository repository)
    {
        _repository = repository;
    }

    public async Task<Guid> Handle(ReplacePpeIssuanceCommand request, CancellationToken ct)
    {
        var issuance = await _repository.GetByIdAsync(request.IssuanceId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"PPE issuance {request.IssuanceId} not found");

        var replacement = issuance.Replace(request.ReplacedBy, request.NewExpiresAt);

        await _repository.AddReplacementAsync(issuance, replacement, ct).ConfigureAwait(false);

        return replacement.IssuanceId;
    }
}
