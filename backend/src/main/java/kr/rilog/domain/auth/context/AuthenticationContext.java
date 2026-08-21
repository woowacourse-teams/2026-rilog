package kr.rilog.domain.auth.context;

import jakarta.servlet.http.HttpServletRequest;
import kr.rilog.domain.auth.exception.AuthException;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;

import static kr.rilog.domain.auth.exception.AuthErrorInformation.AUTHENTICATION_CONTEXT_MISSING;

public final class AuthenticationContext {

    private static final String AUTHENTICATED_USER_ATTRIBUTE = AuthenticationContext.class.getName()
            + ".AUTHENTICATED_USER";

    private AuthenticationContext() {
    }

    public static void set(HttpServletRequest request, AuthenticatedUser authenticatedUser) {
        request.setAttribute(AUTHENTICATED_USER_ATTRIBUTE, authenticatedUser);
    }

    public static AuthenticatedUser get(NativeWebRequest webRequest) {
        AuthenticatedUser authenticatedUser = getOrNull(webRequest);
        if (authenticatedUser != null) {
            return authenticatedUser;
        }

        throw new AuthException(AUTHENTICATION_CONTEXT_MISSING);
    }

    public static AuthenticatedUser getOrNull(NativeWebRequest webRequest) {
        Object attribute = webRequest.getAttribute(
                AUTHENTICATED_USER_ATTRIBUTE,
                RequestAttributes.SCOPE_REQUEST
        );

        if (attribute instanceof AuthenticatedUser authenticatedUser) {
            return authenticatedUser;
        }

        return null;
    }
}
