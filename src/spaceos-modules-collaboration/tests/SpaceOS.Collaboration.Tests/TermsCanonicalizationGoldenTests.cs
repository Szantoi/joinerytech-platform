using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

public sealed class TermsCanonicalizationGoldenTests
{
    [Fact]
    public void CanonicalizeJson_UnsortedObjectKeys_ProducesSortedJson()
    {
        string json1 = """{"sla":"24h","b_scope":"production","a_parties":["Host","Guest"]}""";
        string json2 = """{"a_parties":["Host","Guest"],"sla":"24h","b_scope":"production"}""";

        string canonical1 = TermsCanonicalizer.CanonicalizeJson(json1);
        string canonical2 = TermsCanonicalizer.CanonicalizeJson(json2);

        Assert.Equal(canonical1, canonical2);
        Assert.Equal("""{"a_parties":["Host","Guest"],"b_scope":"production","sla":"24h"}""", canonical1);
    }

    [Fact]
    public void ComputeSha256Hash_IdenticalContentDifferentOrder_ProducesIdenticalHash()
    {
        string jsonA = """
        {
          "title": "Subcontract Agreement",
          "deliverables": ["Frames", "Doors"],
          "commercial": { "currency": "HUF", "amount": 1500000 }
        }
        """;

        string jsonB = """
        {
          "commercial": { "amount": 1500000, "currency": "HUF" },
          "deliverables": ["Frames", "Doors"],
          "title": "Subcontract Agreement"
        }
        """;

        string hashA = TermsCanonicalizer.ComputeSha256Hash(TermsCanonicalizer.CanonicalizeJson(jsonA));
        string hashB = TermsCanonicalizer.ComputeSha256Hash(TermsCanonicalizer.CanonicalizeJson(jsonB));

        Assert.Equal(hashA, hashB);
        Assert.Equal(64, hashA.Length);
    }

    [Fact]
    public void ComputeSha256Hash_UnicodeCharacters_IsDeterministic()
    {
        string json = """{"scope":"Szabászat és Megmunkálás","notes":"Árvíztűrő tükörfúrógép"}""";

        string canonical = TermsCanonicalizer.CanonicalizeJson(json);
        string hash = TermsCanonicalizer.ComputeSha256Hash(canonical);

        Assert.False(string.IsNullOrWhiteSpace(hash));
        Assert.Equal(64, hash.Length);
    }
}
