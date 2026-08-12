package kr.rilog.global.auth.resolver;

import kr.rilog.domain.auth.annotation.LoginUserSlug;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class LoginUserSlugArgumentResolver implements HandlerMethodArgumentResolver{

    private static final String USER_SLUG_HEADER = "X-Test-User-Slug";

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(LoginUserSlug.class)
                && parameter.getParameterType() == String.class;
    }

    // TODO 토큰 구현 후 실제 로직으로 변경할 것.
    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer, NativeWebRequest webRequest, WebDataBinderFactory binderFactory) throws Exception {
        String value = webRequest.getHeader(USER_SLUG_HEADER);

        if (value == null || value.isBlank()) {
            return "testSlug";
        }

        return value;
    }

}
