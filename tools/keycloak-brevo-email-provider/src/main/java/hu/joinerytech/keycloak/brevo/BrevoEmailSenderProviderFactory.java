package hu.joinerytech.keycloak.brevo;

import org.keycloak.Config;
import org.keycloak.email.EmailSenderProvider;
import org.keycloak.email.EmailSenderProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

/**
 * Keycloak 24 service-provider factory for Brevo transactional e-mail.
 *
 * <p>The API key is deliberately not an SPI property. It is read only from the
 * {@code KC_BREVO_API_KEY} process environment variable when Keycloak creates a
 * sender. This keeps it out of the realm model, exports and Keycloak's provider
 * configuration.</p>
 */
public final class BrevoEmailSenderProviderFactory implements EmailSenderProviderFactory {

    /** The id selected by {@code --spi-email-sender-provider=brevo}. */
    public static final String PROVIDER_ID = "brevo";

    private final BrevoTransport transport;

    public BrevoEmailSenderProviderFactory() {
        this(new HttpBrevoTransport());
    }

    BrevoEmailSenderProviderFactory(BrevoTransport transport) {
        this.transport = transport;
    }

    @Override
    public EmailSenderProvider create(KeycloakSession session) {
        // Do not cache or log the key. Keycloak creates providers per session.
        return new BrevoEmailSenderProvider(System.getenv("KC_BREVO_API_KEY"), transport);
    }

    @Override
    public void init(Config.Scope config) {
        // Deliberately no SPI config: the API key must only be a process environment variable.
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        // No cross-session state is needed.
    }

    @Override
    public void close() {
        // HttpClient is managed by the JDK and does not need closing.
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }
}
