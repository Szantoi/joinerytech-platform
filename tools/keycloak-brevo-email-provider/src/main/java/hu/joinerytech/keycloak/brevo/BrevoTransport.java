package hu.joinerytech.keycloak.brevo;

/** Minimal boundary around the Brevo HTTP request; it also makes provider tests network-free. */
@FunctionalInterface
interface BrevoTransport {

    void send(String apiKey, String payload) throws BrevoTransportException;
}
