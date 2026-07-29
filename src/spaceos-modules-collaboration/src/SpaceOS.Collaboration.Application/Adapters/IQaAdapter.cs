namespace SpaceOS.Collaboration.Application.Adapters;

public record InspectionProofReference(string InspectionRef, bool IsPassed, DateTimeOffset InspectedAtUtc, string InspectorName);

public interface IQaAdapter
{
    Task<InspectionProofReference?> VerifyInspectionProofAsync(string inspectionRef, Guid requestingTenantId, CancellationToken cancellationToken = default);
}
