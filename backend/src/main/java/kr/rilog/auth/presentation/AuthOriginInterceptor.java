package kr.rilog.auth.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import org.springframework.http.HttpMethod;
import org.springframework.web.servlet.HandlerInterceptor;

public class AuthOriginInterceptor implements HandlerInterceptor {

    private static final Set<String> PROTECTED_PATHS = Set.of(
            "/api/auth/token/exchange",
            "/api/auth/token/refresh",
            "/api/auth/logout"
    );

    private final String allowedOrigin;

    public AuthOriginInterceptor(String allowedOrigin) {
        this.allowedOrigin = allowedOrigin;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())
                || !PROTECTED_PATHS.contains(request.getRequestURI())) {
            return true;
        }
        if (!allowedOrigin.equals(request.getHeader("Origin"))) {
            throw new AuthException(AuthErrorInformation.UNTRUSTED_ORIGIN);
        }
        return true;
    }

}
