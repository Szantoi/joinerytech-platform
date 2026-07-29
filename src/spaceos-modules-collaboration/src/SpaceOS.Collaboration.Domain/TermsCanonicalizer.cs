using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Deterministic JSON canonicalization service for B2B terms hash calculation (B2B-03).
/// Sorts object properties alphabetically, standardizes UTF-8 strings, and computes SHA-256 hash.
/// </summary>
public static class TermsCanonicalizer
{
    public static string CanonicalizeJson(string uncanonicalizedJson)
    {
        if (string.IsNullOrWhiteSpace(uncanonicalizedJson))
            throw new ArgumentException("JSON content cannot be null or empty.", nameof(uncanonicalizedJson));

        var jsonNode = JsonNode.Parse(uncanonicalizedJson);
        if (jsonNode == null)
            throw new ArgumentException("Invalid JSON content.", nameof(uncanonicalizedJson));

        var sortedNode = SortJsonNode(jsonNode);
        var options = new JsonSerializerOptions
        {
            WriteIndented = false,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };

        return JsonSerializer.Serialize(sortedNode, options);
    }

    public static string ComputeSha256Hash(string canonicalJson)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(canonicalJson);
        byte[] hashBytes = SHA256.HashData(bytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private static JsonNode? SortJsonNode(JsonNode? node)
    {
        if (node is JsonObject obj)
        {
            var sortedObj = new JsonObject();
            var sortedProperties = obj.OrderBy(p => p.Key, StringComparer.Ordinal).ToList();
            foreach (var kvp in sortedProperties)
            {
                sortedObj.Add(kvp.Key, SortJsonNode(kvp.Value?.DeepClone()));
            }
            return sortedObj;
        }

        if (node is JsonArray array)
        {
            var sortedArray = new JsonArray();
            foreach (var item in array)
            {
                sortedArray.Add(SortJsonNode(item?.DeepClone()));
            }
            return sortedArray;
        }

        return node?.DeepClone();
    }
}
