# Keycloak 24 Brevo transactional e-mail provider

This is a small Keycloak 24.0.0 EmailSenderProvider with ServiceLoader id
brevo. It replaces SMTP delivery only after an operator explicitly selects it.
It posts one transactional-message JSON document to this pinned HTTPS endpoint:

    https://api.brevo.com/v3/smtp/email

It has no third-party runtime library. It uses Java's java.net.http.HttpClient,
has a five-second connect timeout and ten-second request timeout, never follows
redirects, discards response bodies, and turns every non-2xx result into a safe
EmailException.

## Security contract

- The Brevo key is read only as System.getenv("KC_BREVO_API_KEY"). It is not
  accepted from an SPI property, keycloak.conf, the realm, a database, or an HTTP
  request.
- The sender/reply-to values are read only from the realm e-mail configuration map:
  from, fromDisplayName, replyTo, and replyToDisplayName.
- Recipient e-mail, sender/reply-to e-mail, subject, display names, body size,
  Unicode validity, and JSON encoding are validated and bounded before transport.
- The provider logs neither the API key, recipient, message body, nor Brevo response
  body. Its errors contain only safe status/category text.
- This provider is intentionally a single-recipient transactional sender. It does
  not expose Brevo campaign, contact-list, template, or bulk-mail API operations.

## Build and deterministic test

Prerequisite: JDK 21 and Maven 3.9+.

    mvn clean verify
    sha256sum target/keycloak-brevo-email-provider-1.0.0.jar

The JUnit suite makes no HTTP request. It proves the fixed JSON shape, escaping,
input rejection, no transport call before validation, the provider id, and the
pinned endpoint. Compiling with --release 21 keeps the provider compatible with
the VPS's Keycloak 24.0.0 Java runtime.

## Planned production installation — do not run without an approved change window

The live VPS currently uses keycloak.service, service user keycloak, and
/opt/keycloak-app. The following is a runbook template only; it was not executed
while creating this provider.

1. Take a Keycloak realm export and record the current provider directory listing,
   active service unit, and candidate JAR SHA-256. Obtain a Brevo transactional API
   key whose sender domain has already been verified in Brevo.
2. Build and stage the exact JAR. Verify its hash again immediately before copy.

       mvn clean verify
       sha256sum target/keycloak-brevo-email-provider-1.0.0.jar
       sudo install -o root -g root -m 0644 \
         target/keycloak-brevo-email-provider-1.0.0.jar \
         /opt/keycloak-app/providers/keycloak-brevo-email-provider-1.0.0.jar

3. Create a root-only systemd environment file. Use the provided example at
   systemd/keycloak-brevo-email.env.example as a shape only; do not put an actual
   API key in the repository.

       sudo install -d -o root -g root -m 0755 /etc/spaceos
       sudo install -o root -g root -m 0600 /dev/null /etc/spaceos/keycloak-brevo-email.env
       sudoedit /etc/spaceos/keycloak-brevo-email.env
       sudo stat -c '%A %a %U:%G %n' /etc/spaceos/keycloak-brevo-email.env

   Expected result:

       -rw------- 600 root:root /etc/spaceos/keycloak-brevo-email.env

   The only content is:

       KC_BREVO_API_KEY=<real-key-kept-out-of-shell-history-and-git>

4. Create the exact root-only service drop-in from
   systemd/keycloak.service.d/20-brevo-email.conf.example.

       sudo install -d -o root -g root -m 0755 /etc/systemd/system/keycloak.service.d
       sudo install -o root -g root -m 0644 \
         systemd/keycloak.service.d/20-brevo-email.conf.example \
         /etc/systemd/system/keycloak.service.d/20-brevo-email.conf
       sudo systemctl daemon-reload
       sudo systemctl cat keycloak.service

   The drop-in puts KC_BREVO_API_KEY in Keycloak's process environment, selects
   KC_SPI_EMAIL_SENDER_PROVIDER=brevo, and explicitly enables that provider with
   KC_SPI_EMAIL_SENDER_BREVO_ENABLED=true. It does not configure any key through a
   Keycloak realm or SPI parameter.

5. Configure sender/reply-to in the spaceos realm. Copy
   scripts/configure-realm-sender.sh.template outside the repository, set its
   non-secret values in the operator's short-lived shell environment, and point
   KCADM_CONFIG to an existing root-only, already-authenticated kcadm config file.
   This avoids passing an administrator password on the command line. Inspect it
   and run it only after approval. Its kcadm update changes only:

       smtpServer.from
       smtpServer.fromDisplayName
       smtpServer.replyTo
       smtpServer.replyToDisplayName

   Both e-mail addresses must be valid and the sender must be verified by Brevo.
   The provider does not read host, port, user, password, auth, or SMTP TLS fields.

6. During the approved maintenance window, rebuild Keycloak's optimized image and
   restart it. Build as the same service user so generated files remain writable.

       sudo systemctl stop keycloak.service
       sudo -u keycloak env KC_SPI_EMAIL_SENDER_PROVIDER=brevo KC_SPI_EMAIL_SENDER_BREVO_ENABLED=true /opt/keycloak-app/bin/kc.sh build
       sudo systemctl start keycloak.service
       sudo systemctl status keycloak.service --no-pager

7. Verify only after health and login checks are green. Then use the Keycloak Test
   connection/test e-mail action with a controlled recipient. That action
   deliberately sends one external message, so it requires the approved change
   window and a confirmed recipient. Inspect journal output only for provider
   selection and redacted errors—never print environment files or keys.

## Rollback runbook

Rollback switches Keycloak back to its built-in default provider and removes the
Brevo process key. It does not mutate users, realms, invitations, or database data.
Execute it only as an approved root operator:

    sudo systemctl stop keycloak.service
    sudo rm -f /etc/systemd/system/keycloak.service.d/20-brevo-email.conf
    sudo rm -f /etc/spaceos/keycloak-brevo-email.env
    sudo rm -f /opt/keycloak-app/providers/keycloak-brevo-email-provider-1.0.0.jar
    sudo systemctl daemon-reload
    sudo -u keycloak env KC_SPI_EMAIL_SENDER_PROVIDER=default /opt/keycloak-app/bin/kc.sh build
    sudo systemctl start keycloak.service
    sudo systemctl status keycloak.service --no-pager

Before removal, copy the JAR and document its hash in the change record if forensic
or repeatable rollback evidence is needed. The realm's smtpServer sender fields may
remain; the default SMTP provider will only use them if SMTP transport fields are
later configured.

## Compatibility boundary

The POM pins org.keycloak:keycloak-server-spi and
org.keycloak:keycloak-server-spi-private to 24.0.0, and targets Java 21. Any
Keycloak upgrade must run mvn clean verify against the target Keycloak version
before the provider is copied to the VPS.
