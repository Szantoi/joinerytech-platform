using System.Collections.ObjectModel;
using System.Reflection;
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// Seals the public bearer posture for mutation detection, while building a fresh private
/// validation profile for every authentication handler. JwtBearer never validates with a
/// collection, handler, event or validation object reachable from public options.
/// </summary>
internal sealed class OidcJwtBearerRuntimeAttestation(
    StrictOidcConfigurationManager configurationManager,
    SpaceOsModuleAuthOptions expectedOptions,
    bool requireHttpsMetadata)
{
    private static readonly PropertyInfo[] ValidationDelegateProperties =
        typeof(TokenValidationParameters)
            .GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Where(static property => typeof(Delegate).IsAssignableFrom(property.PropertyType))
            .OrderBy(static property => property.Name, StringComparer.Ordinal)
            .ToArray();
    private static readonly PropertyInfo[] EventDelegateProperties =
        typeof(JwtBearerEvents)
            .GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Where(static property => typeof(Delegate).IsAssignableFrom(property.PropertyType))
            .OrderBy(static property => property.Name, StringComparer.Ordinal)
            .ToArray();
    private readonly ConditionalWeakTable<JwtBearerOptions, RuntimeContract> _requestContracts = new();
    private readonly object _sync = new();
    private RuntimeContract? _publicContract;

    internal void ConfigureAndSeal(JwtBearerOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        var contract = ConfigureSourceProfile(options, publicProfileWasExactAtCreation: true);
        lock (_sync)
            _publicContract = contract;
    }

    internal IOptionsMonitor<JwtBearerOptions> CreateRequestOptionsMonitor()
    {
        lock (_sync)
        {
            if (_publicContract is null)
            {
                throw new InvalidOperationException(
                    "The source-owned JwtBearer profile was not sealed before handler creation.");
            }
        }

        var publicProfileWasExactAtCreation = IsExactPublicProfile();
        var options = new JwtBearerOptions();
        var contract = ConfigureSourceProfile(options, publicProfileWasExactAtCreation);
        _requestContracts.Add(options, contract);
        return new SourceOwnedJwtBearerOptionsMonitor(options);
    }

    internal bool IsExactRequest(JwtBearerOptions options)
    {
        if (!_requestContracts.TryGetValue(options, out var contract)
            || !contract.PublicProfileWasExactAtCreation)
        {
            return false;
        }

        return HasExactContract(options, contract);
    }

    private bool IsExactPublicProfile()
    {
        RuntimeContract? contract;
        lock (_sync)
            contract = _publicContract;
        return contract is not null && HasExactContract(contract.Options, contract);
    }

    private RuntimeContract ConfigureSourceProfile(
        JwtBearerOptions options,
        bool publicProfileWasExactAtCreation)
    {
        options.Authority = expectedOptions.Authority;
        options.Audience = expectedOptions.Audience;
        options.MetadataAddress = expectedOptions.Authority!.TrimEnd('/')
                                  + "/.well-known/openid-configuration";
        options.RequireHttpsMetadata = requireHttpsMetadata;
        options.Configuration = null;
        options.ConfigurationManager = configurationManager;
        options.MapInboundClaims = false;
        options.BackchannelTimeout = TimeSpan.FromMilliseconds(
            expectedOptions.OidcAuthority.BackchannelTimeoutMilliseconds);
        options.RefreshInterval = TimeSpan.FromSeconds(
            expectedOptions.OidcAuthority.RefreshIntervalSeconds);
        options.AutomaticRefreshInterval = TimeSpan.FromMinutes(
            expectedOptions.OidcAuthority.AutomaticRefreshIntervalMinutes);
        options.RefreshOnIssuerKeyNotFound = true;
        options.SaveToken = false;
        options.IncludeErrorDetails = false;
        options.ForwardAuthenticate = null;
        options.ForwardChallenge = null;
        options.ForwardForbid = null;
        options.ForwardSignIn = null;
        options.ForwardSignOut = null;
        options.ForwardDefault = null;
        options.ForwardDefaultSelector = null;
        options.UseSecurityTokenValidators = false;

        options.TokenHandlers.Clear();
        var tokenHandler = new JsonWebTokenHandler { MapInboundClaims = false };
        options.TokenHandlers.Add(tokenHandler);
        var validationParameters = CreateSourceOwnedValidationParameters();
        options.TokenValidationParameters = validationParameters;
        options.EventsType = null;
        var events = new SourceOwnedJwtBearerEvents(expectedOptions, this);
        options.Events = events;

        return new RuntimeContract(
            options,
            validationParameters,
            tokenHandler,
            events,
            validationParameters.ValidAlgorithms,
            validationParameters.ValidTypes,
            validationParameters.InstancePropertyBag,
            tokenHandler.MaximumTokenSizeInBytes,
            EventDelegateProperties.Select(property => property.GetValue(events)).ToArray(),
            publicProfileWasExactAtCreation);
    }

    private TokenValidationParameters CreateSourceOwnedValidationParameters()
        => new()
        {
            ValidateIssuerSigningKey = true,
            RequireSignedTokens = true,
            ValidateIssuer = true,
            ValidIssuer = expectedOptions.Authority,
            ValidateAudience = true,
            ValidAudience = expectedOptions.Audience,
            ValidateLifetime = true,
            RequireAudience = true,
            RequireExpirationTime = true,
            ValidateWithLKG = false,
            ValidateActor = false,
            ValidateTokenReplay = false,
            ValidateSignatureLast = false,
            RefreshBeforeValidation = false,
            SaveSigninToken = false,
            TryAllIssuerSigningKeys = false,
            IgnoreTrailingSlashWhenValidatingAudience = false,
            IncludeTokenOnFailedValidation = false,
            LogTokenId = false,
            LogValidationExceptions = false,
            ValidAlgorithms = Array.AsReadOnly([SecurityAlgorithms.RsaSha256]),
            ValidTypes = Array.AsReadOnly([expectedOptions.TokenType]),
            ClockSkew = OidcAuthorityClock.MaximumFutureIssuedAtSkew,
            NameClaimType = "preferred_username",
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            CryptoProviderFactory = null,
            PropertyBag = null,
        };

    private bool HasExactContract(JwtBearerOptions options, RuntimeContract contract)
    {
        if (!ReferenceEquals(options, contract.Options)
            || !ReferenceEquals(options.ConfigurationManager, configurationManager)
            || options.Configuration is not null
            || !configurationManager.HasExactSourceOwnedRuntimeContract()
            || !ReferenceEquals(options.TokenValidationParameters, contract.ValidationParameters)
            || options.TokenHandlers.Count != 1
            || !ReferenceEquals(options.TokenHandlers[0], contract.TokenHandler)
            || contract.TokenHandler.GetType() != typeof(JsonWebTokenHandler)
            || options.EventsType is not null
            || !ReferenceEquals(options.Events, contract.Events)
            || options.Events.GetType() != typeof(SourceOwnedJwtBearerEvents)
            || !HasExactEventDelegates(contract)
            || options.UseSecurityTokenValidators
            || options.MapInboundClaims
            || contract.TokenHandler.MapInboundClaims
            || contract.TokenHandler.MaximumTokenSizeInBytes != contract.MaximumTokenSizeInBytes
            || !options.RefreshOnIssuerKeyNotFound
            || options.SaveToken
            || options.IncludeErrorDetails
            || options.ForwardAuthenticate is not null
            || options.ForwardChallenge is not null
            || options.ForwardForbid is not null
            || options.ForwardSignIn is not null
            || options.ForwardSignOut is not null
            || options.ForwardDefault is not null
            || options.ForwardDefaultSelector is not null
            || options.RequireHttpsMetadata != requireHttpsMetadata
            || options.BackchannelTimeout != TimeSpan.FromMilliseconds(
                expectedOptions.OidcAuthority.BackchannelTimeoutMilliseconds)
            || options.RefreshInterval != TimeSpan.FromSeconds(
                expectedOptions.OidcAuthority.RefreshIntervalSeconds)
            || options.AutomaticRefreshInterval != TimeSpan.FromMinutes(
                expectedOptions.OidcAuthority.AutomaticRefreshIntervalMinutes)
            || !string.Equals(options.Authority, expectedOptions.Authority, StringComparison.Ordinal)
            || !string.Equals(options.Audience, expectedOptions.Audience, StringComparison.Ordinal)
            || !string.Equals(
                options.MetadataAddress,
                expectedOptions.Authority!.TrimEnd('/') + "/.well-known/openid-configuration",
                StringComparison.Ordinal))
        {
            return false;
        }

        var validation = contract.ValidationParameters;
        return validation.ValidateIssuerSigningKey
               && validation.RequireSignedTokens
               && validation.ValidateIssuer
               && validation.ValidateAudience
               && validation.ValidateLifetime
               && validation.RequireAudience
               && validation.RequireExpirationTime
               && !validation.ValidateWithLKG
               && !validation.ValidateActor
               && !validation.ValidateTokenReplay
               && !validation.ValidateSignatureLast
               && !validation.RefreshBeforeValidation
               && !validation.SaveSigninToken
               && !validation.TryAllIssuerSigningKeys
               && !validation.IgnoreTrailingSlashWhenValidatingAudience
               && !validation.IncludeTokenOnFailedValidation
               && !validation.LogTokenId
               && !validation.LogValidationExceptions
               && validation.ClockSkew == OidcAuthorityClock.MaximumFutureIssuedAtSkew
               && validation.AuthenticationType is null
               && validation.DebugId is null
               && string.Equals(validation.NameClaimType, "preferred_username", StringComparison.Ordinal)
               && string.Equals(
                   validation.RoleClaimType,
                   System.Security.Claims.ClaimTypes.Role,
                   StringComparison.Ordinal)
               && string.Equals(validation.ValidIssuer, expectedOptions.Authority, StringComparison.Ordinal)
               && validation.ValidIssuers is null
               && string.Equals(validation.ValidAudience, expectedOptions.Audience, StringComparison.Ordinal)
               && validation.ValidAudiences is null
               && ReferenceEquals(validation.ValidAlgorithms, contract.ValidAlgorithms)
               && ReferenceEquals(validation.ValidTypes, contract.ValidTypes)
               && validation.ValidAlgorithms is ReadOnlyCollection<string>
               && validation.ValidTypes is ReadOnlyCollection<string>
               && ExactSingle(validation.ValidAlgorithms, SecurityAlgorithms.RsaSha256)
               && ExactSingle(validation.ValidTypes, expectedOptions.TokenType)
               && validation.IssuerSigningKey is null
               && validation.IssuerSigningKeys is null
               && validation.IssuerSigningKeyResolver is null
               && validation.IssuerSigningKeyResolverUsingConfiguration is null
               && validation.SignatureValidator is null
               && validation.SignatureValidatorUsingConfiguration is null
               && validation.AlgorithmValidator is null
               && validation.AudienceValidator is null
               && validation.TypeValidator is null
               && validation.TokenReader is null
               && validation.TransformBeforeSignatureValidation is null
               && validation.TokenReplayValidator is null
               && validation.TokenReplayCache is null
               && validation.NameClaimTypeRetriever is null
               && validation.RoleClaimTypeRetriever is null
               && validation.IssuerValidator is null
               && validation.IssuerValidatorUsingConfiguration is null
               && validation.IssuerSigningKeyValidator is null
               && validation.IssuerSigningKeyValidatorUsingConfiguration is null
               && validation.LifetimeValidator is null
               && validation.TokenDecryptionKey is null
               && validation.TokenDecryptionKeys is null
               && validation.TokenDecryptionKeyResolver is null
               && validation.ActorValidationParameters is null
               && validation.ConfigurationManager is null
               && validation.CryptoProviderFactory is null
               && validation.PropertyBag is null
               && ReferenceEquals(validation.InstancePropertyBag, contract.InstancePropertyBag)
               && validation.InstancePropertyBag.Count == 0
               && ValidationDelegateProperties.All(
                   property => property.GetValue(validation) is null);
    }

    private static bool ExactSingle(IEnumerable<string>? values, string expected)
        => values is not null
           && values.Take(2).SequenceEqual([expected], StringComparer.Ordinal);

    private static bool HasExactEventDelegates(RuntimeContract contract)
    {
        if (contract.EventDelegates.Length != EventDelegateProperties.Length)
            return false;

        for (var index = 0; index < EventDelegateProperties.Length; index++)
        {
            if (!ReferenceEquals(
                    EventDelegateProperties[index].GetValue(contract.Events),
                    contract.EventDelegates[index]))
            {
                return false;
            }
        }

        return true;
    }

    private sealed record RuntimeContract(
        JwtBearerOptions Options,
        TokenValidationParameters ValidationParameters,
        JsonWebTokenHandler TokenHandler,
        SourceOwnedJwtBearerEvents Events,
        IEnumerable<string>? ValidAlgorithms,
        IEnumerable<string>? ValidTypes,
        IDictionary<string, object> InstancePropertyBag,
        int MaximumTokenSizeInBytes,
        object?[] EventDelegates,
        bool PublicProfileWasExactAtCreation);

    private sealed class SourceOwnedJwtBearerOptionsMonitor(JwtBearerOptions options)
        : IOptionsMonitor<JwtBearerOptions>
    {
        public JwtBearerOptions CurrentValue => options;

        public JwtBearerOptions Get(string? name)
            => string.Equals(name, JwtBearerDefaults.AuthenticationScheme, StringComparison.Ordinal)
                ? options
                : throw new InvalidOperationException(
                    "The source-owned JwtBearer monitor only serves the exact Bearer scheme.");

        public IDisposable? OnChange(Action<JwtBearerOptions, string?> listener)
            => NullChangeRegistration.Instance;
    }

    private sealed class NullChangeRegistration : IDisposable
    {
        internal static readonly NullChangeRegistration Instance = new();

        public void Dispose()
        {
        }
    }
}
