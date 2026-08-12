package kr.rilog.global.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.rilog.auth.application.port.AccessTokenCodec;
import kr.rilog.auth.domain.AuthPrincipal;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String PRINCIPAL_ATTRIBUTE = AuthPrincipal.class.getName();
    private static final String BEARER_PREFIX = "Bearer ";

    private final AuthRequirementResolver requirementResolver;
    private final AccessTokenCodec accessTokenCodec;

    public AuthInterceptor(
            AuthRequirementResolver requirementResolver,
            AccessTokenCodec accessTokenCodec
    ) {
        this.requirementResolver = requirementResolver;
        this.accessTokenCodec = accessTokenCodec;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }
        AuthRequirement requirement = requirementResolver.resolve(handlerMethod);
        if (!requirement.authenticationRequired()) {
            return true;
        }
        AuthPrincipal principal = verify(extractBearerToken(request));
        if (requirement.requiredRole() != null
                && !principal.role().permits(requirement.requiredRole())) {
            throw new AuthException(AuthErrorInformation.INSUFFICIENT_ROLE);
        }
        request.setAttribute(PRINCIPAL_ATTRIBUTE, principal);
        return true;
    }

    private String extractBearerToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization == null
                || !authorization.startsWith(BEARER_PREFIX)
                || authorization.length() == BEARER_PREFIX.length()) {
            throw new AuthException(AuthErrorInformation.MISSING_ACCESS_TOKEN);
        }
        return authorization.substring(BEARER_PREFIX.length());
    }

    private AuthPrincipal verify(String token) {
        try {
            return accessTokenCodec.verify(token);
        } catch (AuthException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new AuthException(AuthErrorInformation.INVALID_ACCESS_TOKEN);
        }
    }
}
