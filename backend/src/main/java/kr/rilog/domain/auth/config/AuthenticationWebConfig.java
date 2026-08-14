package kr.rilog.domain.auth.config;

import kr.rilog.domain.auth.interceptor.BearerAuthenticationInterceptor;
import kr.rilog.domain.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.domain.auth.resolver.LoginUserSlugArgumentResolver;
import kr.rilog.domain.auth.resolver.NullableLoginUserIdArgumentResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class AuthenticationWebConfig implements WebMvcConfigurer {

    private final BearerAuthenticationInterceptor bearerAuthenticationInterceptor;
    private final LoginUserIdArgumentResolver loginUserIdArgumentResolver;
    private final LoginUserSlugArgumentResolver loginUserSlugArgumentResolver;
    private final NullableLoginUserIdArgumentResolver nullableLoginUserIdArgumentResolver;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(bearerAuthenticationInterceptor)
                .addPathPatterns("/v1/**")
                .excludePathPatterns("/v1/auth/**");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(loginUserIdArgumentResolver);
        resolvers.add(loginUserSlugArgumentResolver);
        resolvers.add(nullableLoginUserIdArgumentResolver);
    }
}
