# Verification evidence — 2026-08-11

Scope: source-only provider build. No Keycloak provider JAR, configuration, realm,
VPS secret, service, or e-mail was changed.

## Local source build

- Command: `mvn clean verify`
- Java compilation target: `--release 21`
- Result: BUILD SUCCESS
- Tests: 7 run, 0 failures, 0 errors, 0 skipped
- Built artifact: `target/keycloak-brevo-email-provider-1.0.0.jar`
- SHA-256: `D34A841C11CDB233193F6CFA51F65C531E66DA7A561CCC41E99DC28570BEF6C2`
- ServiceLoader entry present: `META-INF/services/org.keycloak.email.EmailSenderProviderFactory`

The Maven build utility used locally is ignored under `.build-tools/`; it is not
part of the provider artifact. The artifact itself contains provider classes and
the ServiceLoader metadata only, with no bundled third-party runtime libraries.

## Read-only live compatibility check

- Service: `keycloak.service`
- Keycloak home: `/opt/keycloak-app`
- Keycloak version: `24.0.0`
- Running JVM: `21.0.11` (Debian OpenJDK)

The intended runtime selection is `KC_SPI_EMAIL_SENDER_PROVIDER=brevo` with
`KC_SPI_EMAIL_SENDER_BREVO_ENABLED=true`. The Brevo credential is intentionally
not inspected or printed; it is read only as `KC_BREVO_API_KEY` by the provider
at runtime.
