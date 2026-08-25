package hu.joinerytech.keycloak.brevo;

import java.util.Map;
import java.util.Objects;

import org.keycloak.email.EmailException;
import org.keycloak.email.EmailSenderProvider;

/** Sends one validated Keycloak message through the Brevo transactional HTTP API. */
final class BrevoEmailSenderProvider implements EmailSenderProvider {

    private final String apiKey;
    private final BrevoTransport transport;

    BrevoEmailSenderProvider(String apiKey, BrevoTransport transport) {
        this.apiKey = apiKey;
        this.transport = Objects.requireNonNull(transport, "transport");
    }

    @Override
    public void send(
            Map<String, String> realmConfig,
            String recipientAddress,
            String subject,
            String textBody,
            String htmlBody) throws EmailException {
        if (!isUsableApiKey(apiKey)) {
            throw new EmailException("Brevo e-mail sender is not configured.");
        }

        final String payload;
        try {
            payload = BrevoEmailPayload.from(realmConfig, recipientAddress, subject, textBody, htmlBody).toJson();
        } catch (BrevoValidationException exception) {
            // The validation exception never includes address, message body, or credentials.
            throw new EmailException("Brevo e-mail message validation failed.", exception);
        }

        try {
            transport.send(apiKey, payload);
        } catch (BrevoTransportException exception) {
            // Transport errors intentionally omit Brevo response bodies and all sensitive data.
            throw new EmailException("Brevo e-mail delivery failed.", exception);
        }
    }

    @Override
    public void close() {
        // No per-provider resources are open.
    }

    private static boolean isUsableApiKey(String value) {
        if (value == null || value.isBlank() || value.length() > 512) {
            return false;
        }
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (character < 0x21 || character > 0x7e) {
                return false;
            }
        }
        return true;
    }
}
