namespace SpaceOS.Collaboration.Application.Adapters;

public class InMemoryQaAdapter : IQaAdapter
{
    private readonly Dictionary<string, InspectionProofReference> _inspections = new();

    public void RegisterInspection(InspectionProofReference inspection)
    {
        _inspections[inspection.InspectionRef] = inspection;
    }

    public Task<InspectionProofReference?> VerifyInspectionProofAsync(string inspectionRef, Guid requestingTenantId, CancellationToken cancellationToken = default)
    {
        if (_inspections.TryGetValue(inspectionRef, out var inspection))
        {
            return Task.FromResult<InspectionProofReference?>(inspection);
        }

        return Task.FromResult<InspectionProofReference?>(null);
    }
}
