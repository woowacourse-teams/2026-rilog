package kr.rilog.domain.auth.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.auth.annotation.LoginUserSlug;
import kr.rilog.domain.auth.application.AccessTokenClaims;
import kr.rilog.domain.auth.application.AccessTokenService;
import kr.rilog.domain.auth.context.AuthenticatedUser;
import kr.rilog.domain.auth.context.AuthenticationContext;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.AUTHORIZATION_HEADER_MISSING;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.AUTHENTICATION_ANNOTATION_MISSING;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_AUTHORIZATION_HEADER;

@Component
public class BearerAuthenticationInterceptor implements HandlerInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final AccessTokenService accessTokenService;

    public BearerAuthenticationInterceptor(AccessTokenService accessTokenService) {
        this.accessTokenService = accessTokenService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        validateLoginUserParameterUsage(handlerMethod);
        if (!requiresAuthentication(handlerMethod)) {
            return true;
        }

        String accessToken = extractAccessToken(request.getHeader(HttpHeaders.AUTHORIZATION));
        AccessTokenClaims claims = accessTokenService.parse(accessToken);
        AuthenticationContext.set(request, AuthenticatedUser.from(claims));
        return true;
    }

    private void validateLoginUserParameterUsage(HandlerMethod handlerMethod) {
        if (hasLoginUserParameter(handlerMethod) && !hasAuthGuardAnnotation(handlerMethod)) {
            throw new AuthException(AUTHENTICATION_ANNOTATION_MISSING);
        }
    }

    private boolean hasLoginUserParameter(HandlerMethod handlerMethod) {
        for (MethodParameter parameter : handlerMethod.getMethodParameters()) {
            if (parameter.hasParameterAnnotation(LoginUserId.class)
                    || parameter.hasParameterAnnotation(LoginUserSlug.class)) {
                return true;
            }
        }
        return false;
    }

    private boolean requiresAuthentication(HandlerMethod handlerMethod) {
        return hasAuthGuardAnnotation(handlerMethod);
    }

    private boolean hasAuthGuardAnnotation(HandlerMethod handlerMethod) {
        return handlerMethod.hasMethodAnnotation(AuthGuard.class);
    }

    private String extractAccessToken(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader)) {
            throw new AuthException(AUTHORIZATION_HEADER_MISSING);
        }
        if (!authorizationHeader.startsWith(BEARER_PREFIX)) {
            throw new AuthException(INVALID_AUTHORIZATION_HEADER);
        }

        String accessToken = authorizationHeader.substring(BEARER_PREFIX.length());
        if (!StringUtils.hasText(accessToken) || containsWhitespace(accessToken)) {
            throw new AuthException(INVALID_AUTHORIZATION_HEADER);
        }

        return accessToken;
    }

    private boolean containsWhitespace(String value) {
        for (int index = 0; index < value.length(); index++) {
            if (Character.isWhitespace(value.charAt(index))) {
                return true;
            }
        }
        return false;
    }
}
