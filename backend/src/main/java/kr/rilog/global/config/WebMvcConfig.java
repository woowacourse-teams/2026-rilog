package kr.rilog.global.config;

import java.util.List;
import kr.rilog.global.auth.AuthInterceptor;
import kr.rilog.global.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.global.auth.resolver.LoginUserSlugArgumentResolver;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;
    private final LoginUserIdArgumentResolver loginUserIdArgumentResolver;
    private final LoginUserSlugArgumentResolver loginUserSlugArgumentResolver;

    public WebMvcConfig(
            AuthInterceptor authInterceptor,
            LoginUserIdArgumentResolver loginUserIdArgumentResolver,
            LoginUserSlugArgumentResolver loginUserSlugArgumentResolver
    ) {
        this.authInterceptor = authInterceptor;
        this.loginUserIdArgumentResolver = loginUserIdArgumentResolver;
        this.loginUserSlugArgumentResolver = loginUserSlugArgumentResolver;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor);
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(loginUserIdArgumentResolver);
        resolvers.add(loginUserSlugArgumentResolver);
    }
}
