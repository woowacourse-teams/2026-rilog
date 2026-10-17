package kr.rilog.domain.post.view;

import kr.rilog.domain.post.exception.PostException;
import org.springframework.boot.context.properties.ConfigurationProperties;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_REGISTRATION_DISABLED;

@ConfigurationProperties(prefix = "post.view.registration")
public record PostViewRegistrationProperties(boolean enabled, boolean cookieSecure, String cookieSameSite) {

    public PostViewRegistrationProperties {
        cookieSameSite = cookieSameSite == null ? "Lax" : cookieSameSite;
        if (!java.util.Set.of("Lax", "Strict", "None").contains(cookieSameSite)) {
            throw new IllegalArgumentException("방문자 쿠키의 SameSite 설정이 올바르지 않습니다.");
        }
        if ("None".equals(cookieSameSite) && !cookieSecure) {
            throw new IllegalArgumentException("SameSite=None 방문자 쿠키는 Secure가 필요합니다.");
        }
    }

    public void validateRegistrationEnabled() {
        if (!enabled) {
            throw new PostException(POST_VIEW_REGISTRATION_DISABLED);
        }
    }
}
