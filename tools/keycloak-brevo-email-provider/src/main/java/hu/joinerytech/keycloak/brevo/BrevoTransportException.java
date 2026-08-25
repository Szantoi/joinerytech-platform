package hu.joinerytech.keycloak.brevo;

/** A deliberately redacted delivery failure. */
final class BrevoTransportException extends Exception {

    BrevoTransportException(String message) {
        super(message);
    }

    BrevoTransportException(String message, Throwable cause) {
        super(message, cause);
    }
}
