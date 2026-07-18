namespace SpaceOS.Modules.Hosting.Tests.Wire;

using System.Text.Json;
using SpaceOS.Modules.Hosting.Wire;
using Xunit;

/// <summary>
/// Contract tests for the shared <see cref="EnumWireMap{TEnum}"/> /
/// <see cref="WireEnumConverter{TEnum}"/> pair (ADR-059): fail-fast on an
/// uncovered member, exact case-sensitive parsing, and JSON round-trips.
/// </summary>
public sealed class EnumWireMapTests
{
    public enum Sample
    {
        First,
        Second,
        Third
    }

    private static EnumWireMap<Sample> CompleteMap() => new(
        new Dictionary<Sample, string>
        {
            [Sample.First] = "elso",
            [Sample.Second] = "masodik",
            [Sample.Third] = "harmadik"
        });

    [Fact]
    public void Constructor_MissingMember_ThrowsAtStartup()
    {
        var incomplete = new Dictionary<Sample, string>
        {
            [Sample.First] = "elso",
            [Sample.Second] = "masodik"
        };

        var ex = Assert.Throws<ArgumentException>(() => new EnumWireMap<Sample>(incomplete));
        Assert.Contains(nameof(Sample.Third), ex.Message);
    }

    [Fact]
    public void Constructor_DuplicateSpelling_ThrowsAtStartup()
    {
        var duplicated = new Dictionary<Sample, string>
        {
            [Sample.First] = "elso",
            [Sample.Second] = "elso",
            [Sample.Third] = "harmadik"
        };

        var ex = Assert.Throws<ArgumentException>(() => new EnumWireMap<Sample>(duplicated));
        Assert.Contains("elso", ex.Message);
    }

    [Theory]
    [InlineData(Sample.First, "elso")]
    [InlineData(Sample.Second, "masodik")]
    [InlineData(Sample.Third, "harmadik")]
    public void ToWire_And_TryParse_RoundTripEveryMember(Sample value, string wire)
    {
        var map = CompleteMap();

        Assert.Equal(wire, map.ToWire(value));
        Assert.True(map.TryParse(wire, out var parsed));
        Assert.Equal(value, parsed);
    }

    [Theory]
    [InlineData("ELSO")]   // case-sensitive: the contract is exact
    [InlineData("negyedik")]
    [InlineData("")]
    [InlineData(null)]
    public void TryParse_UnknownSpelling_ReturnsFalse(string? wire)
    {
        Assert.False(CompleteMap().TryParse(wire, out _));
    }

    [Fact]
    public void Spellings_ListsEveryAcceptedKey()
    {
        Assert.Equal(
            new[] { "elso", "masodik", "harmadik" },
            CompleteMap().Spellings.OrderBy(s => s == "elso" ? 0 : s == "masodik" ? 1 : 2));
    }

    [Fact]
    public void TranslateNames_ReplacesWholeWordMemberNamesWithWireSpellings()
    {
        var map = CompleteMap();

        var translated = map.TranslateNames("Cannot transition from First to Third");

        Assert.Equal("Cannot transition from elso to harmadik", translated);
    }

    [Fact]
    public void TranslateNames_LeavesPartialWordMatchesAlone()
    {
        var translated = CompleteMap().TranslateNames("FirstAid is not a member; First is");

        Assert.Equal("FirstAid is not a member; elso is", translated);
    }

    private static JsonSerializerOptions OptionsWithConverter()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new WireEnumConverter<Sample>(CompleteMap()));
        return options;
    }

    [Fact]
    public void Converter_SerialisesTheWireSpelling()
    {
        var json = JsonSerializer.Serialize(Sample.Second, OptionsWithConverter());
        Assert.Equal("\"masodik\"", json);
    }

    [Fact]
    public void Converter_ParsesTheWireSpelling()
    {
        var value = JsonSerializer.Deserialize<Sample>("\"harmadik\"", OptionsWithConverter());
        Assert.Equal(Sample.Third, value);
    }

    [Fact]
    public void Converter_UnknownSpelling_ThrowsJsonExceptionListingTheVocabulary()
    {
        var ex = Assert.Throws<JsonException>(
            () => JsonSerializer.Deserialize<Sample>("\"negyedik\"", OptionsWithConverter()));

        Assert.Contains("negyedik", ex.Message);
        Assert.Contains("elso", ex.Message);
    }

    [Fact]
    public void Converter_NonStringToken_ThrowsJsonException()
    {
        Assert.Throws<JsonException>(
            () => JsonSerializer.Deserialize<Sample>("2", OptionsWithConverter()));
    }
}
