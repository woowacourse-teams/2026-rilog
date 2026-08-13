package kr.rilog.domain.auth.context;

import jakarta.servlet.http.HttpServletRequest;
import kr.rilog.domain.auth.application.AccessTokenClaims;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.AUTHENTICATION_CONTEXT_MISSING;

public final class AuthenticationContext {

    private static final String ACCESS_TOKEN_CLAIMS_ATTRIBUTE = AuthenticationContext.class.getName()
            + ".ACCESS_TOKEN_CLAIMS";

    private AuthenticationContext() {
    }

    public static void set(HttpServletRequest request, AccessTokenClaims claims) {
        request.setAttribute(ACCESS_TOKEN_CLAIMS_ATTRIBUTE, claims);
    }

    public static AccessTokenClaims get(NativeWebRequest webRequest) {
        Object attribute = webRequest.getAttribute(
                ACCESS_TOKEN_CLAIMS_ATTRIBUTE,
                RequestAttributes.SCOPE_REQUEST
        );

        if (attribute instanceof AccessTokenClaims claims) {
            return claims;
        }

        throw new AuthException(AUTHENTICATION_CONTEXT_MISSING);
    }
}
