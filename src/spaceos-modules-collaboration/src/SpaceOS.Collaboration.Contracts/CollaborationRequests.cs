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

/// <summary>The agreement's new state after a transition.</summary>
public sealed record AgreementStatusResponse(Guid AgreementId, string Status);

/// <summary>A reason the other side will read (work-package reject, change request, cancel).</summary>
public sealed record WorkPackageReasonRequest(string Reason);

/// <summary>What was delivered — a QA or DMS reference, never the artefact itself.</summary>
public sealed record SubmitWorkPackageRequest(string DeliverableRef);

/// <summary>What proves the delivery was accepted.</summary>
public sealed record CompleteWorkPackageRequest(string CompletionProofRef);
