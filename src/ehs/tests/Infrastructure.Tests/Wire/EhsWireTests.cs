using System.Text.Json;
using FluentAssertions;
using SpaceOS.Modules.Ehs.Application.Wire;
using SpaceOS.Modules.Ehs.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests.Wire;

/// <summary>
/// Contract tests for the EHS wire vocabulary (ADR-059, <see cref="EhsWire"/>):
/// a vocabulary pin per enum, case-sensitivity (English member names must NOT
/// parse), and a JSON round-trip through the shared converter seam
/// (<see cref="EhsWireConverters"/>). Docker-free — no Testcontainers fixture.
/// </summary>
public sealed class EhsWireTests
{
    private static JsonSerializerOptions Options()
    {
        var options = new JsonSerializerOptions();
        options.Converters.AddEhsWireConverters();
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        return options;
    }

    [Fact]
    public void IncidentType_Vocabulary()
        => Enum.GetValues<IncidentType>().Select(EhsWire.IncidentType.ToWire)
            .Should().Equal("baleset", "majdnem_baleset", "veszelyes_allapot");

    [Fact]
    public void IncidentStatus_Vocabulary()
        => Enum.GetValues<IncidentStatus>().Select(EhsWire.IncidentStatus.ToWire)
            .Should().Equal("bejelentve", "kivizsgalva", "intezkedes_tervezve", "lezarva", "ujranyitva");

    [Fact]
    public void Severity_Vocabulary()
        => Enum.GetValues<Severity>().Select(EhsWire.Severity.ToWire)
            .Should().Equal("elhanyagolhato", "enyhe", "kozepes", "sulyos", "katasztrofalis");

    [Fact]
    public void Likelihood_Vocabulary()
        => Enum.GetValues<Likelihood>().Select(EhsWire.Likelihood.ToWire)
            .Should().Equal("ritka", "valoszinutlen", "lehetseges", "valoszinu", "szinte_biztos");

    [Fact]
    public void RiskLevel_Vocabulary()
        => Enum.GetValues<RiskLevel>().Select(EhsWire.RiskLevel.ToWire)
            .Should().Equal("alacsony", "kozepes", "magas", "kritikus");

    [Fact]
    public void RiskStatus_Vocabulary()
        => Enum.GetValues<RiskStatus>().Select(EhsWire.RiskStatus.ToWire)
            .Should().Equal("piszkozat", "ellenorzes", "jovahagyva", "archivalt");

    [Fact]
    public void LocationKind_Vocabulary()
        => Enum.GetValues<LocationKind>().Select(EhsWire.LocationKind.ToWire)
            .Should().Equal("telephely", "epulet", "csarnok", "zona", "kulteri");

    [Fact]
    public void MaterialStatus_Vocabulary()
        => Enum.GetValues<MaterialStatus>().Select(EhsWire.MaterialStatus.ToWire)
            .Should().Equal("aktiv", "archivalt");

    [Fact]
    public void SdsValidity_Vocabulary()
        => Enum.GetValues<SdsValidity>().Select(EhsWire.SdsValidity.ToWire)
            .Should().Equal("ervenyes", "lejaro", "lejart");

    [Fact]
    public void TrainingStatus_Vocabulary()
        => Enum.GetValues<TrainingStatus>().Select(EhsWire.TrainingStatus.ToWire)
            .Should().Equal("ervenyes", "lejaro", "lejart");

    [Fact]
    public void PpeCategory_Vocabulary()
        => Enum.GetValues<PpeCategory>().Select(EhsWire.PpeCategory.ToWire)
            .Should().Equal("fej", "szem", "hallas", "legzes", "kez", "lab", "test", "leeses");

    [Fact]
    public void PpeIssuanceStatus_Vocabulary()
        => Enum.GetValues<PpeIssuanceStatus>().Select(EhsWire.PpeIssuanceStatus.ToWire)
            .Should().Equal("kiadva", "atveve", "visszaadva", "cserelve");

    [Fact]
    public void SafetyWalkStatus_Vocabulary()
        => Enum.GetValues<SafetyWalkStatus>().Select(EhsWire.SafetyWalkStatus.ToWire)
            .Should().Equal("utemezve", "folyamatban", "intezkedes_szukseges", "lezarva", "torolve");

    [Fact]
    public void CapaSource_Vocabulary()
        => Enum.GetValues<CapaSource>().Select(EhsWire.CapaSource.ToWire)
            .Should().Equal("esemeny", "bejaras", "kockazatertekeles");

    [Theory]
    [InlineData("Accident")]
    [InlineData("accident")]
    [InlineData("Baleset")]
    [InlineData("")]
    public void IncidentType_EnglishOrMiscasedKey_DoesNotParse(string wire)
        => EhsWire.IncidentType.TryParse(wire, out _).Should().BeFalse();

    [Theory]
    [InlineData("Draft")]
    [InlineData("Piszkozat")]
    public void RiskStatus_EnglishOrMiscasedKey_DoesNotParse(string wire)
        => EhsWire.RiskStatus.TryParse(wire, out _).Should().BeFalse();

    [Theory]
    [InlineData("Incident")]
    [InlineData("SafetyWalk")]
    [InlineData("RiskAssessment")]
    [InlineData("Kockazatertekeles")]
    [InlineData("")]
    public void CapaSource_EnglishOrMiscasedKey_DoesNotParse(string wire)
        => EhsWire.CapaSource.TryParse(wire, out _).Should().BeFalse();

    [Fact]
    public void JsonRoundTrip_EveryEnum_SerialisesAndParsesTheHungarianKey()
    {
        var options = Options();

        AssertRoundTrip(IncidentType.Accident, "\"baleset\"", options);
        AssertRoundTrip(IncidentStatus.Reopened, "\"ujranyitva\"", options);
        AssertRoundTrip(Severity.Catastrophic, "\"katasztrofalis\"", options);
        AssertRoundTrip(Likelihood.AlmostCertain, "\"szinte_biztos\"", options);
        AssertRoundTrip(RiskLevel.Critical, "\"kritikus\"", options);
        AssertRoundTrip(RiskStatus.Approved, "\"jovahagyva\"", options);
        AssertRoundTrip(LocationKind.Outdoor, "\"kulteri\"", options);
        AssertRoundTrip(MaterialStatus.Active, "\"aktiv\"", options);
        AssertRoundTrip(SdsValidity.Expiring, "\"lejaro\"", options);
        AssertRoundTrip(TrainingStatus.Expired, "\"lejart\"", options);
        AssertRoundTrip(PpeCategory.Fall, "\"leeses\"", options);
        AssertRoundTrip(PpeIssuanceStatus.Replaced, "\"cserelve\"", options);
        AssertRoundTrip(SafetyWalkStatus.ActionRequired, "\"intezkedes_szukseges\"", options);
        AssertRoundTrip(CapaSource.RiskAssessment, "\"kockazatertekeles\"", options);
    }

    private static void AssertRoundTrip<TEnum>(TEnum value, string expectedJson, JsonSerializerOptions options)
        where TEnum : struct, Enum
    {
        var json = JsonSerializer.Serialize(value, options);
        json.Should().Be(expectedJson, because: $"{typeof(TEnum).Name}.{value} must serialise to its wire key");

        var parsed = JsonSerializer.Deserialize<TEnum>(json, options);
        parsed.Should().Be(value);
    }

    [Fact]
    public void Converter_UnknownKey_ThrowsJsonExceptionListingVocabulary()
    {
        var options = Options();

        var act = () => JsonSerializer.Deserialize<IncidentType>("\"Accident\"", options);

        act.Should().Throw<JsonException>()
            .Where(ex => ex.Message.Contains("Accident") && ex.Message.Contains("baleset"));
    }
}
