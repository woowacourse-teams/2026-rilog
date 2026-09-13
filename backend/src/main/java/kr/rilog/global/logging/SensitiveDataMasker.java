package kr.rilog.global.logging;

import java.util.regex.Pattern;

public final class SensitiveDataMasker {

    static final String REDACTED = "<redacted>";

    private static final String SENSITIVE_KEYS = String.join("|",
            "authorization",
            "cookie",
            "set-cookie",
            "access[_-]?token",
            "refresh[_-]?token",
            "id[_-]?token",
            "token",
            "password",
            "passwd",
            "secret",
            "client[_-]?secret",
            "code",
            "state",
            "api[_-]?key",
            "apikey",
            "private[_-]?key"
    );

    private static final Pattern COOKIE_HEADER_PATTERN = Pattern.compile(
            "(?im)(\\b(?:set-)?cookie\\b\\s*:\\s*)[^\\r\\n]*"
    );
    private static final Pattern QUOTED_KEY_VALUE_PATTERN = Pattern.compile(
            "(?i)(\\b(?:" + SENSITIVE_KEYS + ")\\b\\s*[:=]\\s*)([\"'])(.*?)(\\2)"
    );
    private static final Pattern TOKEN_KEY_VALUE_PATTERN = Pattern.compile(
            "(?i)(\\b(?:" + SENSITIVE_KEYS + ")\\b\\s*[:=]\\s*)(?:Bearer\\s+)?[^\\s,;&}\"']+"
    );
    private static final Pattern QUERY_PARAMETER_PATTERN = Pattern.compile(
            "(?i)([?&](?:" + SENSITIVE_KEYS + ")=)[^&#\\s]+"
    );
    private static final Pattern BEARER_TOKEN_PATTERN = Pattern.compile(
            "(?i)Bearer\\s+[^\\s,;]+"
    );

    private SensitiveDataMasker() {
    }

    public static String mask(String value) {
        if (value == null) {
            return null;
        }

        String masked = COOKIE_HEADER_PATTERN.matcher(value)
                .replaceAll(match -> match.group(1) + REDACTED);
        masked = QUOTED_KEY_VALUE_PATTERN.matcher(masked)
                .replaceAll(match -> match.group(1) + match.group(2) + REDACTED + match.group(4));
        masked = TOKEN_KEY_VALUE_PATTERN.matcher(masked)
                .replaceAll(match -> match.group(1) + REDACTED);
        masked = QUERY_PARAMETER_PATTERN.matcher(masked)
                .replaceAll(match -> match.group(1) + REDACTED);
        return BEARER_TOKEN_PATTERN.matcher(masked)
                .replaceAll("Bearer " + REDACTED);
    }

    static String formatThrowable(Throwable throwable) {
        String className = throwable.getClass().getName();
        String message = throwable.getLocalizedMessage();

        if (message == null || message.isBlank()) {
            return className;
        }

        return className + ": " + mask(message);
    }
}
