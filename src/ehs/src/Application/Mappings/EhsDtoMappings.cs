using SpaceOS.Modules.Ehs.Application.CorrectiveActions.DTOs;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.DTOs;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;
using SpaceOS.Modules.Ehs.Application.Locations.DTOs;
using SpaceOS.Modules.Ehs.Application.Ppe.DTOs;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.DTOs;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;
using SpaceOS.Modules.Ehs.Domain.Aggregates.HazardousMaterialAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.SafetyWalkAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.TrainingRecordAggregate;

namespace SpaceOS.Modules.Ehs.Application.Mappings;

/// <summary>
/// Explicit Domain-to-DTO mappings for the EHS read model.
/// Keeping these mappings finite and compile-time checked avoids reflection-based
/// mapping of attacker-controlled recursive object graphs.
/// </summary>
public static class EhsDtoMappings
{
    public static IncidentDto ToDto(this Incident source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new IncidentDto(
            source.IncidentId,
            source.TenantId,
            source.IncidentType,
            source.IncidentDate,
            source.Location,
            source.Description,
            source.Severity,
            source.Status,
            source.ReportedBy,
            source.ReportedAt,
            source.InvestigatedBy,
            source.InvestigatedAt,
            source.ClosedAt,
            source.Investigation?.ToDto(),
            source.CorrectiveActions.Select(ToCorrectiveActionDto).ToList(),
            source.Witnesses.Select(ToDto).ToList());
    }

    public static IncidentInvestigationDto ToDto(this IncidentInvestigation source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new IncidentInvestigationDto(
            source.IncidentInvestigationId,
            source.Findings,
            source.RootCause,
            source.Recommendations,
            source.InvestigatedBy,
            source.CompletedAt);
    }

    public static CorrectiveActionDto ToCorrectiveActionDto(this CorrectiveAction source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new CorrectiveActionDto(
            source.CorrectiveActionId,
            source.Description,
            source.AssignedTo,
            source.DueDate,
            source.CompletedAt,
            source.IsCompleted);
    }

    public static IncidentWitnessDto ToDto(this IncidentWitness source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new IncidentWitnessDto(
            source.IncidentWitnessId,
            source.EmployeeId,
            source.Statement,
            source.RecordedAt);
    }

    public static IncidentListItemDto ToListItemDto(this Incident source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new IncidentListItemDto(
            source.IncidentId,
            source.IncidentType,
            source.IncidentDate,
            source.Location,
            source.Severity,
            source.Status,
            source.ReportedBy);
    }

    public static RiskAssessmentDto ToDto(this RiskAssessment source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new RiskAssessmentDto(
            source.RiskAssessmentId,
            source.TenantId,
            source.HazardDescription,
            source.LocationId,
            source.Severity,
            source.Likelihood,
            source.RiskScore,
            source.RiskLevel,
            source.Status,
            source.AssessedBy,
            source.AssessedAt,
            source.ReviewDueDate,
            source.SubmittedAt,
            source.ApprovedAt,
            source.ArchivedAt,
            source.Controls.Select(ToDto).ToList());
    }

    public static ControlMeasureDto ToDto(this RiskControl source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new ControlMeasureDto(
            source.RiskControlId,
            source.ControlMeasure,
            source.ResponsiblePerson,
            source.ImplementedAt,
            source.VerifiedAt,
            source.IsVerified,
            source.CorrectiveActionId);
    }

    public static RiskAssessmentListItemDto ToListItemDto(this RiskAssessment source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new RiskAssessmentListItemDto(
            source.RiskAssessmentId,
            source.HazardDescription,
            source.LocationId,
            source.Severity,
            source.Likelihood,
            source.RiskScore,
            source.RiskLevel,
            source.Status,
            source.AssessedAt,
            source.ReviewDueDate);
    }

    public static TrainingRecordDto ToDto(this TrainingRecord source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new TrainingRecordDto(
            source.TrainingRecordId,
            source.TenantId,
            source.EmployeeId,
            source.TrainingType,
            source.IssuedBy,
            source.CompletedAt,
            source.ExpiresAt,
            source.Status);
    }

    public static TrainingRecordListItemDto ToListItemDto(this TrainingRecord source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new TrainingRecordListItemDto(
            source.TrainingRecordId,
            source.EmployeeId,
            source.TrainingType,
            source.CompletedAt,
            source.ExpiresAt,
            source.Status);
    }

    public static EhsLocationDto ToDto(this EhsLocation source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new EhsLocationDto(
            source.LocationId,
            source.TenantId,
            source.Code,
            source.Name,
            source.ParentLocationId,
            source.Kind,
            source.IsActive,
            source.CreatedAt);
    }

    public static HazardousMaterialDto ToDto(this HazardousMaterial source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new HazardousMaterialDto(
            source.MaterialId,
            source.TenantId,
            source.Name,
            source.Supplier,
            source.CasNumber,
            new List<string>(source.GhsHazardClasses),
            source.StorageLocationId,
            source.QuantityOnSite,
            source.Unit,
            source.SdsDocumentId,
            source.SdsIssuedAt,
            source.SdsExpiresAt,
            source.Status,
            source.SdsValidity,
            source.RegisteredAt);
    }

    public static HazardousMaterialListItemDto ToListItemDto(this HazardousMaterial source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new HazardousMaterialListItemDto(
            source.MaterialId,
            source.Name,
            source.Supplier,
            source.StorageLocationId,
            source.QuantityOnSite,
            source.Unit,
            source.SdsExpiresAt,
            source.Status,
            source.SdsValidity);
    }

    public static PpeItemDto ToDto(this PpeItem source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new PpeItemDto(
            source.PpeItemId,
            source.TenantId,
            source.Name,
            source.Category,
            source.StandardRef,
            source.DefaultLifetimeMonths,
            source.IsActive,
            source.CreatedAt);
    }

    public static PpeIssuanceDto ToDto(this PpeIssuance source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new PpeIssuanceDto(
            source.IssuanceId,
            source.TenantId,
            source.EmployeeId,
            source.PpeItemId,
            source.IssuedAt,
            source.IssuedBy,
            source.Quantity,
            source.ExpiresAt,
            source.Status,
            source.AcknowledgedAt,
            source.ReturnedAt,
            source.ReplacedAt,
            source.ReplacementIssuanceId,
            source.IsExpired);
    }

    public static SafetyWalkDto ToDto(this SafetyWalk source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new SafetyWalkDto(
            source.SafetyWalkId,
            source.TenantId,
            source.LocationId,
            source.ScheduledDate,
            source.ConductedBy,
            new List<Guid>(source.Participants),
            source.Status,
            source.StartedAt,
            source.CompletedAt,
            source.ClosedAt,
            source.CancelledAt,
            source.Findings.Select(ToDto).ToList());
    }

    public static SafetyWalkFindingDto ToDto(this SafetyWalkFinding source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new SafetyWalkFindingDto(
            source.FindingId,
            source.Description,
            source.Severity,
            source.PhotoS3Key,
            source.RequiresAction,
            source.CorrectiveActionId,
            source.LinkedRiskAssessmentId,
            source.RecordedAt);
    }

    public static SafetyWalkListItemDto ToListItemDto(this SafetyWalk source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new SafetyWalkListItemDto(
            source.SafetyWalkId,
            source.LocationId,
            source.ScheduledDate,
            source.ConductedBy,
            source.Status,
            source.Findings.Count);
    }

    public static CapaDto ToCapaDto(this CorrectiveAction source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new CapaDto(
            source.CorrectiveActionId,
            source.TenantId,
            source.Source,
            source.SourceId,
            source.IncidentId,
            source.FindingId,
            source.Description,
            source.AssignedTo,
            source.DueDate,
            source.CompletedAt,
            source.IsCompleted);
    }
}
