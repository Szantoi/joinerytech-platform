package hu.joinerytech.keycloak.brevo;

/** A deterministic validation failure whose message must not contain untrusted message data. */
final class BrevoValidationException extends IllegalArgumentException {

    BrevoValidationException(String message) {
        super(message);
    }
}
