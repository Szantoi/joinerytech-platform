// Ehs.Application/Common/ICurrentUserContext.cs

namespace Ehs.Application.Common;

/// <summary>
/// Interface for accessing current authenticated user context.
/// </summary>
public interface ICurrentUserContext
{
    /// <summary>Current user's tenant ID.</summary>
    Guid TenantId { get; }

    /// <summary>Current user's ID.</summary>
    Guid UserId { get; }

    /// <summary>Whether user is authenticated.</summary>
    bool IsAuthenticated { get; }
}
