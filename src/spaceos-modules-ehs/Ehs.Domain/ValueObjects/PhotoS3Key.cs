// Ehs.Domain/ValueObjects/PhotoS3Key.cs

namespace Ehs.Domain.ValueObjects;

/// <summary>
/// Value object representing an S3 object key for incident photos.
/// </summary>
public sealed record PhotoS3Key
{
    public string Value { get; init; }

    private PhotoS3Key(string value) => Value = value;

    public static PhotoS3Key From(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("PhotoS3Key cannot be empty.", nameof(value));

        if (value.Length > 500)
            throw new ArgumentException("PhotoS3Key cannot exceed 500 characters.", nameof(value));

        return new PhotoS3Key(value);
    }

    public static PhotoS3Key? FromNullable(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : From(value);

    public override string ToString() => Value;
}
