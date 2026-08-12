package kr.rilog.global.config;

import java.util.List;
import kr.rilog.auth.config.AuthProperties;
import kr.rilog.auth.presentation.AuthOriginInterceptor;
import kr.rilog.global.auth.AuthInterceptor;
import kr.rilog.global.auth.resolver.LoginUserIdArgumentResolver;
import kr.rilog.global.auth.resolver.LoginUserSlugArgumentResolver;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;
    private final AuthOriginInterceptor authOriginInterceptor;
    private final LoginUserIdArgumentResolver loginUserIdArgumentResolver;
    private final LoginUserSlugArgumentResolver loginUserSlugArgumentResolver;
    private final AuthProperties authProperties;

    public WebMvcConfig(
            AuthInterceptor authInterceptor,
            AuthOriginInterceptor authOriginInterceptor,
            LoginUserIdArgumentResolver loginUserIdArgumentResolver,
            LoginUserSlugArgumentResolver loginUserSlugArgumentResolver,
            AuthProperties authProperties
    ) {
        this.authInterceptor = authInterceptor;
        this.authOriginInterceptor = authOriginInterceptor;
        this.loginUserIdArgumentResolver = loginUserIdArgumentResolver;
        this.loginUserSlugArgumentResolver = loginUserSlugArgumentResolver;
        this.authProperties = authProperties;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authOriginInterceptor)
                .addPathPatterns(
                        "/api/auth/token/exchange",
                        "/api/auth/token/refresh",
                        "/api/auth/logout"
                );
        registry.addInterceptor(authInterceptor);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(authProperties.frontendOrigin())
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type")
                .exposedHeaders("Authorization")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(loginUserIdArgumentResolver);
        resolvers.add(loginUserSlugArgumentResolver);
    }

}
