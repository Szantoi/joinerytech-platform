namespace SpaceOS.Collaboration.Contracts;

/// <summary>
/// The wire payloads of the collaboration API (B2B-10 F3/2).
/// </summary>
/// <remarks>
/// <b>Not one of these carries a tenant or a user.</b> That is the structural half of the
/// anti-spoofing measure B2B-02 asked for: the actor is taken from the token by the endpoint, so
/// there is no field for a client to put somebody else's tenant into. The guard is the second
/// half, for entry points that are not these endpoints.
/// </remarks>
public sealed record AcceptAgreementRequest(Guid TermsRevisionId, string AcceptanceEvidence);

/// <summary>A refusal the other party can act on.</summary>
public sealed record RejectAgreementRequest(string Reason);

/// <summary>Withdrawing an unanswered offer; the reason is optional, as in the aggregate.</summary>
public sealed record CancelAgreementRequest(string? Reason);

/// <summary>The revision that replaces the terms in force.</summary>
public sealed record SupersedeAgreementRequest(Guid SupersedingTermsRevisionId);

/// <summary>The agreement's new state after a transition, with the tag for the next request.</summary>
public sealed record AgreementStatusResponse(Guid AgreementId, string Status, int RowVersion);

/// <summary>
/// A new delegated work package under an agreement (B2B-10 F5/1).
/// </summary>
/// <remarks>
/// No tenant pair: host and guest come from the agreement in the route, so the payload cannot
/// delegate to a third party. The anchor is mandatory here because it is mandatory at birth —
/// see <c>CollaborationAgreement.DelegateWork</c>.
/// </remarks>
public sealed record CreateWorkPackageRequest(
    string Title,
    string? ScopeDescription,
    DateTimeOffset DueAtUtc,
    WorkScopeRequest WorkScope);

/// <summary>The Kernel anchor the new package will serve: project → epic → optional task.</summary>
public sealed record WorkScopeRequest(Guid ProjectId, Guid EpicId, Guid? TaskId = null);

/// <summary>A reason the other side will read (work-package reject, change request, cancel).</summary>
public sealed record WorkPackageReasonRequest(string Reason);

/// <summary>What was delivered — a QA or DMS reference, never the artefact itself.</summary>
public sealed record SubmitWorkPackageRequest(string DeliverableRef);

/// <summary>What proves the delivery was accepted.</summary>
public sealed record CompleteWorkPackageRequest(string CompletionProofRef);
