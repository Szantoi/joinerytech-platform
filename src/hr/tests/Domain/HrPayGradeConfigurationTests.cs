using FluentAssertions;
using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.HR.Application.Configuration;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Services;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Domain;

/// <summary>
/// ADR-060: the pay grade band is a taxonomy key; the hourly rate is tenant configuration
/// ("Hr:PayGrades"). The defaults mirror the portal seed (mocks/hr.ts HR_PAY_GRADE_META).
/// </summary>
public class HrPayGradeConfigurationTests
{
    [Theory]
    [InlineData(PayGradeBand.Helper, 2600)]
    [InlineData(PayGradeBand.SkilledWorker, 3800)]
    [InlineData(PayGradeBand.Master, 5200)]
    [InlineData(PayGradeBand.Engineer, 6400)]
    [InlineData(PayGradeBand.Lead, 8000)]
    public void Default_MirrorsThePortalSeedRates(PayGradeBand band, decimal expectedRate)
    {
        HrPayGradeConfiguration.Default.RateFor(band).Should().Be(expectedRate);
    }

    [Fact]
    public void Constructor_CustomTenantRates_AreReturnedPerBand()
    {
        var config = new HrPayGradeConfiguration(3000m, 4500m, 6000m, 7000m, 9000m);

        config.RateFor(PayGradeBand.Helper).Should().Be(3000m);
        config.RateFor(PayGradeBand.Lead).Should().Be(9000m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_NonPositiveRate_FailsFast(decimal invalidRate)
    {
        var act = () => new HrPayGradeConfiguration(invalidRate, 3800m, 5200m, 6400m, 8000m);

        act.Should().Throw<DomainException>()
            .WithMessage("Hr:PayGrades:Helper must be a positive hourly rate");
    }

    [Fact]
    public void Options_SectionName_IsTheDocumentedConfigKey()
    {
        HrPayGradesOptions.SectionName.Should().Be("Hr:PayGrades");
    }

    [Fact]
    public void Options_UnboundDefaults_ConvertToTheDomainDefaults()
    {
        // A missing "Hr:PayGrades" section degrades to the portal-seed defaults.
        var config = new HrPayGradesOptions().ToConfiguration();

        foreach (var band in Enum.GetValues<PayGradeBand>())
        {
            config.RateFor(band).Should().Be(HrPayGradeConfiguration.Default.RateFor(band));
        }
    }

    [Fact]
    public void Options_BoundValues_WinOverDefaults()
    {
        var options = new HrPayGradesOptions { Master = 5900m };

        var config = options.ToConfiguration();

        config.RateFor(PayGradeBand.Master).Should().Be(5900m);
        config.RateFor(PayGradeBand.Helper).Should().Be(2600m); // untouched default
    }

    [Fact]
    public void Options_InvalidBoundValue_FailsFastOnConversion()
    {
        var options = new HrPayGradesOptions { Engineer = -5m };

        var act = () => options.ToConfiguration();

        act.Should().Throw<DomainException>()
            .WithMessage("Hr:PayGrades:Engineer must be a positive hourly rate");
    }
}
