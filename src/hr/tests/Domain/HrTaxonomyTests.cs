using FluentAssertions;
using SpaceOS.Modules.HR.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Domain;

/// <summary>
/// ADR-060 taxonomy guards — the enum sets are the backend mirror of the portal's
/// designer-APPROVED woodworking taxonomy (modules/hr/services/employees.ts zod schemas).
/// If a member is added/removed/renamed here without a portal-side decision, these
/// tests fail loudly instead of drifting silently.
/// </summary>
public class HrTaxonomyTests
{
    [Fact]
    public void Department_IsThePortalSixKeyOperationalAxis()
    {
        // Portal hrDeptSchema: gyartas, szereles, logisztika, tervezes, ertekesites, iroda
        Enum.GetNames<Department>().Should().BeEquivalentTo(
            "Production",    // gyartas
            "Installation",  // szereles
            "Logistics",     // logisztika
            "Design",        // tervezes
            "Sales",         // ertekesites
            "Office");       // iroda
    }

    [Fact]
    public void SkillKey_IsThePortalTenKeyJoinerySet()
    {
        // Portal skillKeySchema: szabas, elzaras, cnc, osszeszereles, felulet,
        //                        szerel, szallit, felmer, tervezes, ertekesites
        Enum.GetNames<SkillKey>().Should().BeEquivalentTo(
            "Cutting",          // szabas
            "EdgeBanding",      // elzaras
            "Cnc",              // cnc
            "Assembly",         // osszeszereles
            "SurfaceFinishing", // felulet
            "Installation",     // szerel
            "Delivery",         // szallit
            "SiteSurvey",       // felmer
            "Design",           // tervezes
            "Sales");           // ertekesites
    }

    [Fact]
    public void SkillLevel_IsThePortalThreeGradeScale_WithWireNumericValues()
    {
        // Portal skillLevelSchema: 1 | 2 | 3 — the numeric enum values ARE the wire values.
        Enum.GetValues<SkillLevel>().Should().BeEquivalentTo(new[]
        {
            SkillLevel.Basic, SkillLevel.Proficient, SkillLevel.Master
        });
        ((int)SkillLevel.Basic).Should().Be(1);
        ((int)SkillLevel.Proficient).Should().Be(2);
        ((int)SkillLevel.Master).Should().Be(3);
    }

    [Fact]
    public void PayGradeBand_IsThePortalFiveBandSet()
    {
        // Portal payGradeSchema: seged, szakmunkas, mester, mernok, vezeto
        Enum.GetNames<PayGradeBand>().Should().BeEquivalentTo(
            "Helper",        // seged
            "SkilledWorker", // szakmunkas
            "Master",        // mester
            "Engineer",      // mernok
            "Lead");         // vezeto
    }
}
