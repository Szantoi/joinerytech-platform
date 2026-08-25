# Door Manufacturing Keycloak e-mail theme

This is a minimal Keycloak 24 e-mail-only theme for Door Manufacturing account
activation messages. It deliberately inherits Keycloak's `base` e-mail layout
and overrides only the execute-actions subject and bodies in English and
Hungarian.

It contains no credentials, user data, action links, sender address, or runtime
configuration. The associated Keycloak realm must explicitly select
`emailTheme: door-manufacturing` after the archive has been installed.

## Build and inspect

From this directory, package the archive with a JDK:

```sh
jar --create --file target/door-manufacturing-email-theme-1.0.0.jar \
  -C META-INF keycloak-themes.json \
  -C theme door-manufacturing
jar --list --file target/door-manufacturing-email-theme-1.0.0.jar
```

The expected archive paths are `META-INF/keycloak-themes.json` and
`theme/door-manufacturing/email/...`.

## Installation boundary

Install the exact JAR into `/opt/keycloak-app/providers/`, then run
`kc.sh build` and restart `keycloak.service` during a maintenance operation.
Take a realm export and a Keycloak H2 backup first. Set `emailTheme` only on the
`spaceos` realm; do not alter SMTP credentials or any user state.
