# Kernel-backed online identity authority provider

Status: source-ready, explicit opt-in, default-off. This slice does not activate any
platform host and does not contain a production credential adapter.

## Security boundary

`KernelOnlineIdentityAuthorityStateProvider` implements the existing
`IOnlineIdentityAuthorityStateProvider` contract. It performs one fixed, read-only
resolution operation:

```http
POST /api/internal/identity-authority/resolve
Content-Type: application/json

{"subject":"operator-42","tenantId":"11111111-2222-4333-8444-555555555555"}
```

A 200 response must have exactly the `spaceos.online-identity-authority/v1` schema,
echo the exact subject and tenant, carry recognised tenant/membership statuses,
positive membership/projection versions, a UTC revoke cutoff and sorted, unique,
canonical permission/module arrays. Duplicate or extra JSON properties are rejected.
404 is the only unknown-subject response. Every other error fails closed; expired
cache content is never used as fallback.

The POST has read-only semantics in the Kernel contract. Retry is implemented only
inside this provider and only for .NET 8 `HttpRequestError.ConnectionError` and HTTP
408/429/502/503/504. Attempt/total cancellation, DNS, TLS/certificate, protocol,
generic transport and response-body failures are never retried. It is not a general
POST retry policy.

## Explicit composition

The Hosting package deliberately ships no credential implementation. A host-owned
adapter resolves the configured opaque reference from its approved certificate or
secret store and applies a dedicated service identity. It must not forward the user
bearer token and must not transmit the reference. The provider attests the request
after the adapter returns: the original `Accept` plus `Authorization` and optional
`DPoP` are the complete request-header allowlist, at least one service proof is
required, and method, URI, body and content headers must remain exact. Adapter work is
inside the same total timeout even if it ignores cancellation; late faults are observed
and the request is never sent after timeout. The request uses the source-pinned absolute
resolve URI. A final handler re-attests that URI and the post-auth request fingerprint
after `HttpClient` default-header merging. That boundary is the source-owned primary
handler and owns its transport privately, so every delegating handler remains outside
it. A final builder filter rejects primary-handler replacement. Later `BaseAddress`,
default-header, proof, URI/header/body handler mutation or custom-primary overrides
therefore fail closed before any transport can observe the request.

```csharp
services.AddKernelOnlineIdentityAuthorityStateProvider<MyServiceAuthenticator>(
    configuration);
services.AddSpaceOsModuleAuth(configuration, environment);
```

Without the first, explicit call, `AddSpaceOsModuleAuth` keeps its existing deny-all
provider. The seven platform hosts intentionally make no such call in this slice.

```json
{
  "IdentityAuthority": {
    "Kernel": {
      "Enabled": true,
      "BaseUrl": "SOURCE_PIN_REQUIRED",
      "ServiceAuthReference": "vault://joinerytech/kernel-authority-client",
      "TotalTimeoutMilliseconds": 1500,
      "AttemptTimeoutMilliseconds": 600,
      "MaxAttempts": 2,
      "RetryDelayMilliseconds": 50,
      "CacheTtlMilliseconds": 0,
      "MaxResponseBytes": 32768,
      "ReadinessMaximumAgeSeconds": 60
    }
  }
}
```

`ServiceAuthReference` is a reference, not a credential. Allowed prefixes are
`env://`, `vault://` and `certificate://`; inline values are rejected. The actual host
environment is resolved by DI and options are validated on startup without a network
request. Production requires an exact source-pinned HTTPS DNS URI, including port and
base path. That pin is intentionally `null` in this slice: activation therefore needs a
reviewed source change and cannot be achieved by configuration alone. Development HTTP
is accepted only when the internal friend-test transport marker is actually registered,
the application is the exact test assembly, `AllowDevelopmentLoopbackHttp=true`, and the
URI is the source-pinned `http://127.0.0.1:65535/`. The runtime sockets transport is
unconditionally HTTPS-only; the public flag alone can never authorize clear-text traffic.

## Observability

The provider records bounded outcome and latency metrics without subject, tenant or
credential labels. The readiness check observes real authorization lookups: before the
first lookup it is unhealthy; recent 200/404 contact is healthy; a dependency failure or
expired last-success timestamp is unhealthy. It never invents a subject for a probe.

## Local proof

The test suite uses an in-process fake HTTP Kernel and no credentials or external
network. Its internal transport hook is friend-visible only to the exact test assembly
and is independently gated to Development plus the source-pinned loopback endpoint:

```powershell
dotnet test tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj `
  --filter "FullyQualifiedName~KernelOnlineIdentityAuthority"
```

This is a provider/transport proof, not live Kernel persistence, Keycloak, service-key
custody or activation evidence.
