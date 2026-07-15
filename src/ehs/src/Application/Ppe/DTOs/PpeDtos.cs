using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Ppe.DTOs;

/// <summary>PPE catalogue item</summary>
public record PpeItemDto(
    Guid PpeItemId,
    Guid TenantId,
    string Name,
    PpeCategory Category,
    string? StandardRef,
    int? DefaultLifetimeMonths,
    bool IsActive,
    DateTimeOffset CreatedAt
);

/// <summary>
/// PPE issuance — IsExpired is calculated from ExpiresAt, never stored.
/// </summary>
public record PpeIssuanceDto(
    Guid IssuanceId,
    Guid TenantId,
    Guid EmployeeId,
    Guid PpeItemId,
    DateTimeOffset IssuedAt,
    Guid IssuedBy,
    int Quantity,
    DateTimeOffset? ExpiresAt,
    PpeIssuanceStatus Status,
    DateTimeOffset? AcknowledgedAt,
    DateTimeOffset? ReturnedAt,
    DateTimeOffset? ReplacedAt,
    Guid? ReplacementIssuanceId,
    bool IsExpired
);
