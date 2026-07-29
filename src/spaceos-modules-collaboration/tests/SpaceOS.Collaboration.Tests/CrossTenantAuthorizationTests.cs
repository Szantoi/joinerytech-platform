using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Collaboration.Infrastructure.Data;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

public sealed class CrossTenantAuthorizationTests
{
    [Fact]
    public async Task EFCore_DbContext_Queries_SupportHostAndGuestFiltering()
    {
        var options = new DbContextOptionsBuilder<CollaborationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var hostTenantId = Guid.NewGuid();
        var guestTenantId = Guid.NewGuid();
        var attackerTenantId = Guid.NewGuid();

        using (var db = new CollaborationDbContext(options))
        {
            var agreement = CollaborationAgreement.Create(hostTenantId, guestTenantId, "Frame Supply Subcontract", DateTimeOffset.UtcNow);
            var grant = agreement.AddGrant("subcontract.execute", Guid.NewGuid(), DateTimeOffset.UtcNow);
            db.Agreements.Add(agreement);
            await db.SaveChangesAsync();
        }

        using (var db = new CollaborationDbContext(options))
        {
            // Host Tenant query simulation
            var hostAgreements = await db.Agreements
                .Include(a => a.Grants)
                .Where(a => a.HostTenantId == hostTenantId || a.GuestTenantId == hostTenantId)
                .ToListAsync();

            Assert.Single(hostAgreements);
            Assert.Single(hostAgreements[0].Grants);

            // Guest Tenant query simulation
            var guestAgreements = await db.Agreements
                .Include(a => a.Grants)
                .Where(a => a.HostTenantId == guestTenantId || a.GuestTenantId == guestTenantId)
                .ToListAsync();

            Assert.Single(guestAgreements);

            // Attacker Tenant query simulation (Fail-Closed 404 / empty)
            var attackerAgreements = await db.Agreements
                .Where(a => a.HostTenantId == attackerTenantId || a.GuestTenantId == attackerTenantId)
                .ToListAsync();

            Assert.Empty(attackerAgreements);
        }
    }

    [Fact]
    public async Task RevokedGrant_Filter_ExcludesRevokedGrant()
    {
        var options = new DbContextOptionsBuilder<CollaborationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var hostTenantId = Guid.NewGuid();
        var guestTenantId = Guid.NewGuid();

        using (var db = new CollaborationDbContext(options))
        {
            var agreement = CollaborationAgreement.Create(hostTenantId, guestTenantId, "Cutting Subcontract", DateTimeOffset.UtcNow);
            var grant = agreement.AddGrant("production.cutting", Guid.NewGuid(), DateTimeOffset.UtcNow);
            db.Agreements.Add(agreement);
            await db.SaveChangesAsync();

            // Revoke grant
            grant.Revoke("Revoked for audit test", DateTimeOffset.UtcNow);
            await db.SaveChangesAsync();
        }

        using (var db = new CollaborationDbContext(options))
        {
            var activeGrants = await db.ParticipantGrants
                .Where(g => (g.HostTenantId == guestTenantId || g.GuestTenantId == guestTenantId) && g.Status == ParticipantGrantStatus.Active)
                .ToListAsync();

            Assert.Empty(activeGrants);
        }
    }
}
