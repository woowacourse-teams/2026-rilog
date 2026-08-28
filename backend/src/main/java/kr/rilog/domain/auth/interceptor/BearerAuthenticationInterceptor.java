package kr.rilog.domain.auth.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.rilog.domain.auth.annotation.AuthGuard;
import kr.rilog.domain.auth.annotation.LoginUserId;
import kr.rilog.domain.auth.annotation.NullableLoginUserId;
import kr.rilog.domain.auth.annotation.OptionalAuthGuard;
import kr.rilog.domain.auth.application.token.TokenType;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenClaims;
import kr.rilog.domain.auth.context.AuthenticatedUser;
import kr.rilog.domain.auth.context.AuthenticationContext;
import kr.rilog.domain.auth.exception.AuthException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.AUTHORIZATION_HEADER_MISSING;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.AUTHORIZATION_FAILED;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.AUTHENTICATION_ANNOTATION_MISSING;
import static kr.rilog.domain.auth.exception.AuthErrorInformation.INVALID_AUTHORIZATION_HEADER;

@Component
@RequiredArgsConstructor
public class BearerAuthenticationInterceptor implements HandlerInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final AccessTokenProvider accessTokenProvider;
    private final OnboardingTokenProvider onboardingTokenProvider;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        validateLoginUserParameterUsage(handlerMethod);
        AuthGuard authGuard = authGuard(handlerMethod);
        OptionalAuthGuard optionalAuthGuard = optionalAuthGuard(handlerMethod);
        validateAuthenticationAnnotationUsage(authGuard, optionalAuthGuard);
        if (authGuard == null && optionalAuthGuard == null) {
            return true;
        }

        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authGuard == null && !StringUtils.hasText(authorizationHeader)) {
            return true;
        }

        String bearerToken = extractBearerToken(authorizationHeader);
        AuthenticatedUser authenticatedUser = authenticate(bearerToken, tokenType(authGuard));
        if (authGuard != null) {
            authorize(authGuard, authenticatedUser);
        }
        AuthenticationContext.set(request, authenticatedUser);
        return true;
    }

    private void validateAuthenticationAnnotationUsage(AuthGuard authGuard, OptionalAuthGuard optionalAuthGuard) {
        if (authGuard != null && optionalAuthGuard != null) {
            throw new AuthException(AUTHENTICATION_ANNOTATION_MISSING);
        }
        if (authGuard != null && authGuard.value() != TokenType.ACCESS && authGuard.roles().length > 0) {
            throw new AuthException(AUTHENTICATION_ANNOTATION_MISSING);
        }
    }

    private void validateLoginUserParameterUsage(HandlerMethod handlerMethod) {
        if (hasLoginUserParameter(handlerMethod) && authGuard(handlerMethod) == null) {
            throw new AuthException(AUTHENTICATION_ANNOTATION_MISSING);
        }
        if (hasNullableLoginUserParameter(handlerMethod)
                && authGuard(handlerMethod) == null
                && optionalAuthGuard(handlerMethod) == null) {
            throw new AuthException(AUTHENTICATION_ANNOTATION_MISSING);
        }
    }

    private boolean hasLoginUserParameter(HandlerMethod handlerMethod) {
        for (MethodParameter parameter : handlerMethod.getMethodParameters()) {
            if (parameter.hasParameterAnnotation(LoginUserId.class)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasNullableLoginUserParameter(HandlerMethod handlerMethod) {
        for (MethodParameter parameter : handlerMethod.getMethodParameters()) {
            if (parameter.hasParameterAnnotation(NullableLoginUserId.class)) {
                return true;
            }
        }
        return false;
    }

    private void authorize(AuthGuard authGuard, AuthenticatedUser authenticatedUser) {
        GlobalRole[] requiredRoles = authGuard.roles();
        if (requiredRoles.length == 0) {
            return;
        }

        for (GlobalRole requiredRole : requiredRoles) {
            if (requiredRole == authenticatedUser.role()) {
                return;
            }
        }

        throw new AuthException(AUTHORIZATION_FAILED);
    }

    private AuthGuard authGuard(HandlerMethod handlerMethod) {
        return handlerMethod.getMethodAnnotation(AuthGuard.class);
    }

    private OptionalAuthGuard optionalAuthGuard(HandlerMethod handlerMethod) {
        return handlerMethod.getMethodAnnotation(OptionalAuthGuard.class);
    }

    private TokenType tokenType(AuthGuard authGuard) {
        if (authGuard == null) {
            return TokenType.ACCESS;
        }
        return authGuard.value();
    }

    private AuthenticatedUser authenticate(String bearerToken, TokenType tokenType) {
        if (tokenType == TokenType.ONBOARDING) {
            OnboardingTokenClaims claims = onboardingTokenProvider.parse(bearerToken);
            return AuthenticatedUser.from(claims);
        }

        AccessTokenClaims claims = accessTokenProvider.parse(bearerToken);
        return AuthenticatedUser.from(claims);
    }

    private String extractBearerToken(String authorizationHeader) {
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
