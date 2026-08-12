package kr.rilog.domain.auth.resolver;

import kr.rilog.domain.auth.annotation.LoginUserId;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class LoginUserIdArgumentResolver implements HandlerMethodArgumentResolver{

    private static final String USER_ID_HEADER = "X-Test-User-Id";

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(LoginUserId.class)
                && (parameter.getParameterType() == Long.class
                || parameter.getParameterType() == long.class);
    }

    // TODO 토큰 구현 후 실제 로직으로 변경할 것.
    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer, NativeWebRequest webRequest, WebDataBinderFactory binderFactory) throws Exception {
        String value = webRequest.getHeader(USER_ID_HEADER);

        if (value == null || value.isBlank()) {
            return 1L;
        }

        try {
            return Long.valueOf(value);
        } catch (NumberFormatException exception) {
            return 1L;
        }
    }

}
