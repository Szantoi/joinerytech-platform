using Microsoft.Extensions.Options;

namespace SpaceOS.Collaboration.Infrastructure.Kernel;

/// <summary>
/// Where the Kernel lives and how long we wait for it (B2B-10 F5/2).
/// </summary>
/// <remarks>
/// <b>The base URL has no default on purpose.</b> The tree holds three precedents of
/// <c>?? "http://127.0.0.1:500x"</c>, and the F5 task doc bans the pattern by name: a silent
/// fallback means a host missing its configuration RUNS, resolving anchors against whatever
/// happens to listen on a developer port. Here the same mistake refuses to start
/// (<c>ValidateOnStart</c>), which is the cheapest possible time to learn about it.
/// </remarks>
public sealed class KernelProjectAdapterOptions
{
    /// <summary>Configuration section the options bind from.</summary>
    public const string SectionName = "Collaboration:Kernel";

    /// <summary>Kernel base URL, e.g. <c>https://kernel.internal:5001</c>. Required, no default.</summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>Per-call budget for one resolution, in seconds.</summary>
    /// <remarks>
    /// The default is deliberately short: this call sits inside a user's create request, and a
    /// Kernel that takes longer than this is, for that user's purposes, down — the fail-closed
    /// 503 with a named reason beats a request that hangs.
    /// </remarks>
    public int TimeoutSeconds { get; set; } = 5;
}

/// <summary>Startup-time validation behind <c>ValidateOnStart</c>.</summary>
public sealed class KernelProjectAdapterOptionsValidator : IValidateOptions<KernelProjectAdapterOptions>
{
    public ValidateOptionsResult Validate(string? name, KernelProjectAdapterOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        if (string.IsNullOrWhiteSpace(options.BaseUrl))
        {
            return ValidateOptionsResult.Fail(
                $"{KernelProjectAdapterOptions.SectionName}:BaseUrl is required; the Kernel-backed " +
                "project adapter refuses to guess where the Kernel lives (no silent localhost fallback).");
        }

        if (!Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return ValidateOptionsResult.Fail(
                $"{KernelProjectAdapterOptions.SectionName}:BaseUrl must be an absolute http(s) URL; got '{options.BaseUrl}'.");
        }

        if (options.TimeoutSeconds <= 0)
        {
            return ValidateOptionsResult.Fail(
                $"{KernelProjectAdapterOptions.SectionName}:TimeoutSeconds must be positive; got {options.TimeoutSeconds}.");
        }

        return ValidateOptionsResult.Success;
    }
}
