# JWT RS256 Setup Pattern

**Use case:** Authenticate user login, issue JWT token

## 1. Kernel Service (C#)

```csharp
// Services/TokenService.cs
public class TokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config) => _config = config;

    public string GenerateToken(User user, IEnumerable<string> roles)
    {
        var key = new RsaSecurityKey(RSA.Create(2048));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.RsaSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

## 2. appsettings.json

```json
{
  "Jwt": {
    "Issuer": "https://spaceos.joinerytech.hu",
    "Audience": "spaceos-portal",
    "ExpiresInHours": 24
  }
}
```

## 3. Startup (Program.cs)

```csharp
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://keycloak.vps.hu/realms/spaceos";
        options.Audience = "spaceos-portal";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true
        };
    });
```

**See also:** [SECURITY_PATTERNS.md](../patterns/SECURITY_PATTERNS.md)
