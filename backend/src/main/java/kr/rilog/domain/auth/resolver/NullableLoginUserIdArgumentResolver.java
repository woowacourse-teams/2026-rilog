package kr.rilog.domain.auth.resolver;

import kr.rilog.domain.auth.annotation.NullableLoginUserId;
import kr.rilog.domain.auth.context.AuthenticatedUser;
import kr.rilog.domain.auth.context.AuthenticationContext;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class NullableLoginUserIdArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(NullableLoginUserId.class)
                && parameter.getParameterType() == Long.class;
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory
    ) {
        AuthenticatedUser authenticatedUser = AuthenticationContext.getOrNull(webRequest);
        if (authenticatedUser == null) {
            return null;
        }
        return authenticatedUser.userId();
    }

}
