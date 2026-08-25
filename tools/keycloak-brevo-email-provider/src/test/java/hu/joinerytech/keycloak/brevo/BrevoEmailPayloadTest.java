package hu.joinerytech.keycloak.brevo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import java.util.ServiceLoader;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.keycloak.email.EmailException;
import org.keycloak.email.EmailSenderProviderFactory;

class BrevoEmailPayloadTest {

    private static final Map<String, String> REALM_CONFIG = Map.of(
            "from", "no-reply@joinerytech.hu",
            "fromDisplayName", "JoineryTech",
            "replyTo", "support@joinerytech.hu",
            "replyToDisplayName", "JoineryTech Support");

    @Test
    void serializesTheFixedBrevoContractDeterministically() {
        String json = BrevoEmailPayload.from(
                        REALM_CONFIG,
                        "szantoi.g@gmail.com",
                        "Password reset",
                        "Plain message",
                        "<p>HTML message</p>")
                .toJson();

        assertEquals(
                "{\"sender\":{\"email\":\"no-reply@joinerytech.hu\",\"name\":\"JoineryTech\"},"
                        + "\"to\":[{\"email\":\"szantoi.g@gmail.com\"}],"
                        + "\"subject\":\"Password reset\","
                        + "\"replyTo\":{\"email\":\"support@joinerytech.hu\",\"name\":\"JoineryTech Support\"},"
                        + "\"textContent\":\"Plain message\","
                        + "\"htmlContent\":\"<p>HTML message</p>\"}",
                json);
    }

    @Test
    void escapesJsonControlsAndPreservesUnicode() {
        String json = BrevoEmailPayload.from(
                        Map.of("from", "no-reply@joinerytech.hu"),
                        "szantoi.g@gmail.com",
                        "A \"quoted\" subject",
                        "line one\nline two\\done\u2028",
                        null)
                .toJson();

        assertTrue(json.contains("\"subject\":\"A \\\"quoted\\\" subject\""));
        assertTrue(json.contains("\"textContent\":\"line one\\nline two\\\\done\\u2028\""));
        assertFalse(json.contains("\n"));
    }

    @Test
    void rejectsInvalidBoundaryValuesWithoutEchoingThem() {
        assertThrows(
                BrevoValidationException.class,
                () -> BrevoEmailPayload.from(Map.of(), "szantoi.g@gmail.com", "Subject", "Body", null));
        assertThrows(
                BrevoValidationException.class,
                () -> BrevoEmailPayload.from(REALM_CONFIG, "victim@example.com\r\nbcc@attacker.test", "Subject", "Body", null));
        assertThrows(
                BrevoValidationException.class,
                () -> BrevoEmailPayload.from(REALM_CONFIG, "szantoi.g@gmail.com", "Subject", null, null));
        assertThrows(
                BrevoValidationException.class,
                () -> BrevoEmailPayload.from(REALM_CONFIG, "szantoi.g@gmail.com", "Subject", "\uD800", null));
        assertThrows(
                BrevoValidationException.class,
                () -> BrevoEmailPayload.from(REALM_CONFIG, "szantoi.g@gmail.com", "x".repeat(256), "Body", null));
    }

    @Test
    void providerDoesNotCallTransportWhenConfigOrKeyIsInvalid() {
        AtomicInteger sent = new AtomicInteger();
        BrevoTransport countingTransport = (apiKey, payload) -> sent.incrementAndGet();

        BrevoEmailSenderProvider unconfigured = new BrevoEmailSenderProvider(" ", countingTransport);
        EmailException missingKey = assertThrows(
                EmailException.class,
                () -> unconfigured.send(REALM_CONFIG, "szantoi.g@gmail.com", "Subject", "Body", null));
        assertEquals("Brevo e-mail sender is not configured.", missingKey.getMessage());

        BrevoEmailSenderProvider malformedKey = new BrevoEmailSenderProvider("bad\r\nkey", countingTransport);
        assertThrows(
                EmailException.class,
                () -> malformedKey.send(REALM_CONFIG, "szantoi.g@gmail.com", "Subject", "Body", null));

        BrevoEmailSenderProvider nonAsciiKey = new BrevoEmailSenderProvider("badákey", countingTransport);
        assertThrows(
                EmailException.class,
                () -> nonAsciiKey.send(REALM_CONFIG, "szantoi.g@gmail.com", "Subject", "Body", null));

        BrevoEmailSenderProvider configured = new BrevoEmailSenderProvider("test-only-key", countingTransport);
        assertThrows(
                EmailException.class,
                () -> configured.send(REALM_CONFIG, "invalid", "Subject", "Body", null));
        assertEquals(0, sent.get());
    }

    @Test
    void providerUsesTransportOnlyAfterValidationAndHasPinnedEndpoint() throws Exception {
        AtomicInteger sent = new AtomicInteger();
        BrevoTransport transport = (apiKey, payload) -> {
            assertEquals("test-only-key", apiKey);
            assertTrue(payload.contains("\"to\":[{\"email\":\"szantoi.g@gmail.com\"}]"));
            sent.incrementAndGet();
        };

        new BrevoEmailSenderProvider("test-only-key", transport)
                .send(REALM_CONFIG, "szantoi.g@gmail.com", "Subject", "Body", null);

        assertEquals(1, sent.get());
        assertEquals("https", HttpBrevoTransport.ENDPOINT.getScheme());
        assertEquals("api.brevo.com", HttpBrevoTransport.ENDPOINT.getHost());
        assertEquals("/v3/smtp/email", HttpBrevoTransport.ENDPOINT.getPath());
    }

    @Test
    void factoryIdIsTheConfiguredProviderId() {
        assertEquals("brevo", new BrevoEmailSenderProviderFactory().getId());
    }

    @Test
    void serviceLoaderCanDiscoverTheBrevoFactory() {
        assertTrue(ServiceLoader.load(EmailSenderProviderFactory.class)
                .stream()
                .map(ServiceLoader.Provider::get)
                .anyMatch(factory -> "brevo".equals(factory.getId())));
    }
}
