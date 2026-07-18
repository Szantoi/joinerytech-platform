using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Persistence;

/// <summary>
/// Contract tests of the shared RLS session interceptor (ADR-062): parameterised
/// <c>set_config</c>, pool reset, and — most importantly — the fail-loud rule that
/// replaced the silent <c>catch (Exception) {{ }}</c> of the EHS/QA copies.
/// </summary>
public sealed class SpaceOsTenantSessionInterceptorTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private sealed class UnresolvedTenantContext : ITenantContext
    {
        public bool HasTenant => false;
        public Guid TenantId => throw new InvalidOperationException("unresolved");
    }

    private static IHttpContextAccessor Accessor(HttpContext? context)
        => new HttpContextAccessor { HttpContext = context };

    private static HttpContext AuthenticatedContext()
    {
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", "someone")], "test")),
        };
        return context;
    }

    private static SpaceOsTenantSessionInterceptor CreateInterceptor(
        ITenantContext tenantContext,
        HttpContext? httpContext)
        => new(
            tenantContext,
            Accessor(httpContext),
            NullLogger<SpaceOsTenantSessionInterceptor>.Instance);

    private static ConnectionEndEventData OpenedEventData(FakeDbConnection connection)
        => new(null!, null!, connection, null, Guid.NewGuid(), false, DateTimeOffset.UtcNow, TimeSpan.Zero);

    private static ConnectionEventData ClosingEventData(FakeDbConnection connection)
        => new(null!, null!, connection, null, Guid.NewGuid(), false, DateTimeOffset.UtcNow);

    [Fact]
    public void Resolved_tenant_is_set_via_parameterised_set_config()
    {
        var connection = new FakeDbConnection();
        var interceptor = CreateInterceptor(new FixedTenantContext(TenantA), httpContext: null);

        interceptor.ConnectionOpened(connection, OpenedEventData(connection));

        var (commandText, parameters) = Assert.Single(connection.ExecutedCommands);
        Assert.Equal("SELECT set_config(@key, @value, false)", commandText);
        Assert.Equal(TenancyDefaults.PgSessionKey, parameters["@key"]);
        Assert.Equal(TenantA.ToString(), parameters["@value"]);
    }

    [Fact]
    public async Task Async_open_uses_the_same_parameterised_command()
    {
        var connection = new FakeDbConnection();
        var interceptor = CreateInterceptor(new FixedTenantContext(TenantA), httpContext: null);

        await interceptor.ConnectionOpenedAsync(connection, OpenedEventData(connection));

        var (_, parameters) = Assert.Single(connection.ExecutedCommands);
        Assert.Equal(TenantA.ToString(), parameters["@value"]);
    }

    [Fact]
    public void Authenticated_request_without_resolved_tenant_fails_loud()
    {
        // The old EHS/QA interceptors would have silently proceeded here — serving every
        // tenant's rows. The shared interceptor refuses to run the query.
        var connection = new FakeDbConnection();
        var interceptor = CreateInterceptor(new UnresolvedTenantContext(), AuthenticatedContext());

        var exception = Assert.Throws<InvalidOperationException>(() =>
            interceptor.ConnectionOpened(connection, OpenedEventData(connection)));

        Assert.Contains("without a resolved tenant", exception.Message);
        Assert.Empty(connection.ExecutedCommands);
    }

    [Fact]
    public void Background_work_without_tenant_sets_the_empty_fail_closed_value()
    {
        var connection = new FakeDbConnection();
        var interceptor = CreateInterceptor(new UnresolvedTenantContext(), httpContext: null);

        interceptor.ConnectionOpened(connection, OpenedEventData(connection));

        var (_, parameters) = Assert.Single(connection.ExecutedCommands);
        Assert.Equal(string.Empty, parameters["@value"]);
    }

    [Fact]
    public void Connection_closing_resets_the_session_key_for_the_pool()
    {
        var connection = new FakeDbConnection();
        var interceptor = CreateInterceptor(new FixedTenantContext(TenantA), httpContext: null);

        interceptor.ConnectionClosing(connection, ClosingEventData(connection), default);

        var (_, parameters) = Assert.Single(connection.ExecutedCommands);
        Assert.Equal(string.Empty, parameters["@value"]);
    }

    [Fact]
    public void Database_errors_are_never_swallowed()
    {
        // ADR-062: "az interceptor SOHA ne nyelje el a hibát" — a missing function, a broken
        // connection, anything: the request must die, not silently leak tenants.
        var connection = new FakeDbConnection
        {
            ThrowOnExecute = new InvalidOperationException("42883: function does not exist"),
        };
        var interceptor = CreateInterceptor(new FixedTenantContext(TenantA), httpContext: null);

        var exception = Assert.Throws<InvalidOperationException>(() =>
            interceptor.ConnectionOpened(connection, OpenedEventData(connection)));

        Assert.Contains("42883", exception.Message);
    }
}
