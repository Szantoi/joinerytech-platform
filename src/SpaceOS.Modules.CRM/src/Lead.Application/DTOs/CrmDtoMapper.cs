using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Application.Wire;
using SpaceOS.Modules.CRM.Domain.Aggregates;

namespace SpaceOS.Modules.CRM.Application.DTOs;

/// <summary>
/// Single aggregate → DTO mapping for the CRM module (QA <c>TicketDtoMapper</c>
/// precedent). Before CRM-BE-HOST every command/query handler carried its own
/// private copy of this mapping (~20 duplicates, several referencing properties
/// the aggregates never had) — they all delegate here now.
///
/// The DTO's string-typed enum fields carry the portal's canonical Hungarian
/// wire keys via <see cref="CrmWire"/> (ADR-059) — the domain aggregate stays
/// English, the translation happens here at the mapping seam.
/// </summary>
public static class CrmDtoMapper
{
    /// <summary>Lead aggregate → LeadDto (activity/task counters included).</summary>
    public static LeadDto ToDto(Lead lead) => new()
    {
        Id = lead.Id,
        TenantId = lead.TenantId,
        Status = CrmWire.LeadStatus.ToWire(lead.Status),
        ContactName = lead.ContactInfo.Name,
        Email = lead.ContactInfo.Email,
        Phone = lead.ContactInfo.Phone,
        Company = lead.ContactInfo.Company,
        Source = CrmWire.LeadSource.ToWire(lead.Source),
        AssignedToUserId = lead.AssignedTo,
        OpportunityRef = lead.OpportunityRef,
        ActivityCount = lead.Activities.Count,
        TaskCount = lead.Tasks.Count,
        OpenTaskCount = lead.Tasks.Count(t => !t.IsCompleted),
        CreatedAt = lead.CreatedAt,
        UpdatedAt = lead.UpdatedAt
    };

    /// <summary>Opportunity aggregate → OpportunityDto.</summary>
    public static OpportunityDto ToDto(Opportunity opportunity) => new()
    {
        Id = opportunity.Id,
        TenantId = opportunity.TenantId,
        Status = CrmWire.OpportunityStatus.ToWire(opportunity.Status),
        LeadId = opportunity.LeadId,
        CustomerId = opportunity.CustomerId,
        ContactName = opportunity.ContactInfo.Name,
        Email = opportunity.ContactInfo.Email,
        Phone = opportunity.ContactInfo.Phone,
        Company = opportunity.ContactInfo.Company,
        Title = opportunity.Title,
        EstimatedValue = opportunity.EstimatedValue.Amount,
        Currency = opportunity.EstimatedValue.Currency,
        FinalValue = opportunity.FinalValue?.Amount,
        Probability = opportunity.Probability,
        ExpectedCloseDate = opportunity.ExpectedCloseDate,
        AssignedToUserId = opportunity.AssignedTo,
        OrderRef = opportunity.OrderId,
        QuoteRef = opportunity.QuoteId,
        LossReason = opportunity.LossReason,
        CompetitorName = opportunity.CompetitorName,
        ActivityCount = opportunity.Activities.Count,
        TaskCount = opportunity.Tasks.Count,
        OpenTaskCount = opportunity.Tasks.Count(t => !t.IsCompleted),
        CreatedAt = opportunity.CreatedAt,
        UpdatedAt = opportunity.UpdatedAt
    };

    /// <summary>Activity child entity → ActivityDto.</summary>
    public static ActivityDto ToDto(Activity activity) => new()
    {
        Type = activity.Type,
        Description = activity.Description,
        CreatedBy = activity.CreatedBy,
        CreatedAt = activity.CreatedAt
    };

    /// <summary>Task child entity → TaskDto.</summary>
    public static TaskDto ToDto(CrmTask task) => new()
    {
        Id = task.Id,
        Title = task.Title,
        DueDate = task.DueDate,
        Priority = task.Priority,
        IsCompleted = task.IsCompleted,
        CreatedBy = task.CreatedBy,
        CreatedAt = task.CreatedAt
    };
}
