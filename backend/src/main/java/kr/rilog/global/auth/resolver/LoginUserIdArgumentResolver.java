package kr.rilog.global.auth.resolver;

import kr.rilog.auth.domain.AuthPrincipal;
import kr.rilog.global.auth.annotation.LoginUserId;
import kr.rilog.global.auth.AuthInterceptor;
import kr.rilog.global.exception.AuthErrorInformation;
import kr.rilog.global.exception.AuthException;
import org.springframework.core.MethodParameter;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class LoginUserIdArgumentResolver implements HandlerMethodArgumentResolver{

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(LoginUserId.class)
                && (parameter.getParameterType() == Long.class
                || parameter.getParameterType() == long.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer, NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        AuthPrincipal principal = (AuthPrincipal) webRequest.getAttribute(
                AuthInterceptor.PRINCIPAL_ATTRIBUTE,
                NativeWebRequest.SCOPE_REQUEST
        );
        if (principal == null) {
            throw new AuthException(AuthErrorInformation.MISSING_ACCESS_TOKEN);
        }
        return principal.userId();
    }

}
