package kr.rilog.domain.post.view;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ViewerCookieResolver {

    public static final String COOKIE_NAME = "rilog_visitor";
    private final PostViewRegistrationProperties properties;

    public ResolvedViewer resolve(Long requesterId, String cookieValue) {
        if (requesterId != null) {
            return new ResolvedViewer(ViewerIdentity.member(requesterId), null);
        }
        UUID existing = parse(cookieValue);
        if (existing != null) {
            return new ResolvedViewer(ViewerIdentity.anonymous(existing), null);
        }
        UUID id = UUID.randomUUID();
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, id.toString())
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite(properties.cookieSameSite())
                .path("/v1")
                .maxAge(Duration.ofDays(30))
                .build();
        return new ResolvedViewer(ViewerIdentity.anonymous(id), cookie);
    }

    private UUID parse(String value) {
        if (value == null || value.length() != 36) {
            return null;
        }
        try {
            UUID id = UUID.fromString(value);
            return id.toString().equalsIgnoreCase(value) ? id : null;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    public record ResolvedViewer(ViewerIdentity identity, ResponseCookie cookie) { }
}
