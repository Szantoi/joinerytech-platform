package hu.joinerytech.keycloak.brevo;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Strict, dependency-free representation of the fixed Brevo transactional-message contract.
 * Sender and reply-to values are read exclusively from the Keycloak realm e-mail configuration.
 */
final class BrevoEmailPayload {

    private static final int MAX_EMAIL_LENGTH = 320;
    private static final int MAX_DISPLAY_NAME_LENGTH = 128;
    private static final int MAX_SUBJECT_LENGTH = 255;
    private static final int MAX_BODY_CHARACTERS = 524_288;
    private static final int MAX_PAYLOAD_BYTES = 1_048_576;

    private final String senderEmail;
    private final String senderName;
    private final String recipientEmail;
    private final String replyToEmail;
    private final String replyToName;
    private final String subject;
    private final String textBody;
    private final String htmlBody;

    private BrevoEmailPayload(
            String senderEmail,
            String senderName,
            String recipientEmail,
            String replyToEmail,
            String replyToName,
            String subject,
            String textBody,
            String htmlBody) {
        this.senderEmail = senderEmail;
        this.senderName = senderName;
        this.recipientEmail = recipientEmail;
        this.replyToEmail = replyToEmail;
        this.replyToName = replyToName;
        this.subject = subject;
        this.textBody = textBody;
        this.htmlBody = htmlBody;
    }

    static BrevoEmailPayload from(
            Map<String, String> realmConfig,
            String recipientAddress,
            String subject,
            String textBody,
            String htmlBody) {
        if (realmConfig == null) {
            throw new BrevoValidationException("Realm e-mail configuration is missing.");
        }

        String senderEmail = requiredEmail(realmConfig.get("from"), "Realm sender address is invalid.");
        String senderName = optionalDisplayName(realmConfig.get("fromDisplayName"));
        String replyToEmail = optionalEmail(realmConfig.get("replyTo"), "Realm reply-to address is invalid.");
        String replyToName = optionalDisplayName(realmConfig.get("replyToDisplayName"));
        String recipientEmail = requiredEmail(recipientAddress, "Recipient e-mail address is invalid.");
        String validatedSubject = requiredSubject(subject);
        String validatedText = optionalBody(textBody, "Text body is invalid.");
        String validatedHtml = optionalBody(htmlBody, "HTML body is invalid.");

        if (isBlank(validatedText) && isBlank(validatedHtml)) {
            throw new BrevoValidationException("An e-mail body is required.");
        }

        return new BrevoEmailPayload(
                senderEmail,
                senderName,
                recipientEmail,
                replyToEmail,
                replyToName,
                validatedSubject,
                validatedText,
                validatedHtml);
    }

    String toJson() {
        StringBuilder json = new StringBuilder(512);
        json.append("{\"sender\":{\"email\":");
        appendJsonString(json, senderEmail);
        if (senderName != null) {
            json.append(",\"name\":");
            appendJsonString(json, senderName);
        }
        json.append("},\"to\":[{\"email\":");
        appendJsonString(json, recipientEmail);
        json.append("}],\"subject\":");
        appendJsonString(json, subject);
        if (replyToEmail != null) {
            json.append(",\"replyTo\":{\"email\":");
            appendJsonString(json, replyToEmail);
            if (replyToName != null) {
                json.append(",\"name\":");
                appendJsonString(json, replyToName);
            }
            json.append('}');
        }
        if (textBody != null) {
            json.append(",\"textContent\":");
            appendJsonString(json, textBody);
        }
        if (htmlBody != null) {
            json.append(",\"htmlContent\":");
            appendJsonString(json, htmlBody);
        }
        json.append('}');

        String result = json.toString();
        if (result.getBytes(StandardCharsets.UTF_8).length > MAX_PAYLOAD_BYTES) {
            throw new BrevoValidationException("E-mail payload exceeds its maximum size.");
        }
        return result;
    }

    private static String requiredEmail(String value, String failure) {
        String normalized = normalized(value);
        if (normalized == null || !isValidEmail(normalized)) {
            throw new BrevoValidationException(failure);
        }
        return normalized;
    }

    private static String optionalEmail(String value, String failure) {
        String normalized = normalized(value);
        if (normalized == null) {
            return null;
        }
        if (!isValidEmail(normalized)) {
            throw new BrevoValidationException(failure);
        }
        return normalized;
    }

    private static boolean isValidEmail(String value) {
        if (value.length() > MAX_EMAIL_LENGTH || containsControl(value)) {
            return false;
        }
        int separator = value.indexOf('@');
        if (separator <= 0 || separator != value.lastIndexOf('@') || separator > 64 || separator == value.length() - 1) {
            return false;
        }
        String local = value.substring(0, separator);
        String domain = value.substring(separator + 1);
        if (local.startsWith(".") || local.endsWith(".") || local.contains("..") || !domain.contains(".")) {
            return false;
        }
        for (int index = 0; index < local.length(); index++) {
            char character = local.charAt(index);
            if (!(isAsciiLetterOrDigit(character) || ".!#$%&'*+/=?^_`{|}~-".indexOf(character) >= 0)) {
                return false;
            }
        }
        for (String label : domain.split("\\.", -1)) {
            if (label.isEmpty() || label.length() > 63 || label.startsWith("-") || label.endsWith("-")) {
                return false;
            }
            for (int index = 0; index < label.length(); index++) {
                char character = label.charAt(index);
                if (!(isAsciiLetterOrDigit(character) || character == '-')) {
                    return false;
                }
            }
        }
        return true;
    }

    private static boolean isAsciiLetterOrDigit(char character) {
        return character >= 'a' && character <= 'z'
                || character >= 'A' && character <= 'Z'
                || character >= '0' && character <= '9';
    }

    private static String optionalDisplayName(String value) {
        String normalized = normalized(value);
        if (normalized == null) {
            return null;
        }
        if (normalized.length() > MAX_DISPLAY_NAME_LENGTH || containsControl(normalized) || containsUnpairedSurrogate(normalized)) {
            throw new BrevoValidationException("Display name is invalid.");
        }
        return normalized;
    }

    private static String requiredSubject(String value) {
        if (value == null || value.isBlank() || value.length() > MAX_SUBJECT_LENGTH
                || containsControl(value) || containsUnpairedSurrogate(value)) {
            throw new BrevoValidationException("E-mail subject is invalid.");
        }
        return value;
    }

    private static String optionalBody(String value, String failure) {
        if (value == null) {
            return null;
        }
        if (value.length() > MAX_BODY_CHARACTERS || containsUnpairedSurrogate(value)) {
            throw new BrevoValidationException(failure);
        }
        return value;
    }

    private static boolean containsControl(String value) {
        for (int index = 0; index < value.length(); index++) {
            if (Character.isISOControl(value.charAt(index))) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsUnpairedSurrogate(String value) {
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (Character.isHighSurrogate(character)) {
                if (index + 1 >= value.length() || !Character.isLowSurrogate(value.charAt(index + 1))) {
                    return true;
                }
                index++;
            } else if (Character.isLowSurrogate(character)) {
                return true;
            }
        }
        return false;
    }

    private static String normalized(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static void appendJsonString(StringBuilder target, String value) {
        target.append('"');
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            switch (character) {
                case '"' -> target.append("\\\"");
                case '\\' -> target.append("\\\\");
                case '\b' -> target.append("\\b");
                case '\f' -> target.append("\\f");
                case '\n' -> target.append("\\n");
                case '\r' -> target.append("\\r");
                case '\t' -> target.append("\\t");
                case '\u2028' -> target.append("\\u2028");
                case '\u2029' -> target.append("\\u2029");
                default -> {
                    if (character < 0x20) {
                        target.append("\\u00");
                        target.append(Character.forDigit((character >>> 4) & 0xf, 16));
                        target.append(Character.forDigit(character & 0xf, 16));
                    } else {
                        target.append(character);
                    }
                }
            }
        }
        target.append('"');
    }
}
