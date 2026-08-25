package hu.joinerytech.keycloak.brevo;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/** HTTPS-only Brevo API client with fixed endpoint, bounded timeouts and redirects disabled. */
final class HttpBrevoTransport implements BrevoTransport {

    static final URI ENDPOINT = URI.create("https://api.brevo.com/v3/smtp/email");
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);

    private final HttpClient client;

    HttpBrevoTransport() {
        this(HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(HttpClient.Redirect.NEVER)
                .build());
    }

    HttpBrevoTransport(HttpClient client) {
        this.client = client;
    }

    @Override
    public void send(String apiKey, String payload) throws BrevoTransportException {
        final HttpRequest request = HttpRequest.newBuilder(ENDPOINT)
                .timeout(REQUEST_TIMEOUT)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json; charset=utf-8")
                .header("api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        try {
            // Discard the response body so provider logs cannot expose Brevo's response or message metadata.
            HttpResponse<Void> response = client.send(request, HttpResponse.BodyHandlers.discarding());
            int status = response.statusCode();
            if (status < 200 || status >= 300) {
                throw new BrevoTransportException("Brevo returned HTTP status " + status + ".");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BrevoTransportException("Brevo request was interrupted.", exception);
        } catch (IOException exception) {
            throw new BrevoTransportException("Brevo request failed.", exception);
        }
    }
}
