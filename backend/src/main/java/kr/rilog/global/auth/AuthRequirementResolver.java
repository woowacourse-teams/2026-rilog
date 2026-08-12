package kr.rilog.global.auth;

import java.lang.reflect.Method;
import kr.rilog.auth.domain.GlobalRole;
import kr.rilog.global.auth.annotation.LoginRequired;
import kr.rilog.global.auth.annotation.LoginUserId;
import kr.rilog.global.auth.annotation.LoginUserSlug;
import kr.rilog.global.auth.annotation.RequireRole;
import org.springframework.core.MethodParameter;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;

@Component
public class AuthRequirementResolver {

    public AuthRequirement resolve(HandlerMethod handlerMethod) {
        Class<?> controllerType = handlerMethod.getBeanType();
        Method method = handlerMethod.getMethod();
        RequireRole classRole = AnnotatedElementUtils.findMergedAnnotation(
                controllerType, RequireRole.class
        );
        RequireRole methodRole = AnnotatedElementUtils.findMergedAnnotation(
                method, RequireRole.class
        );
        GlobalRole requiredRole = strongerRole(classRole, methodRole);
        boolean loginAnnotation = AnnotatedElementUtils.hasAnnotation(
                controllerType, LoginRequired.class
        ) || AnnotatedElementUtils.hasAnnotation(method, LoginRequired.class);
        boolean principalParameter = hasPrincipalParameter(handlerMethod);
        boolean authenticationRequired = requiredRole != null
                || loginAnnotation
                || principalParameter;
        return authenticationRequired
                ? new AuthRequirement(true, requiredRole)
                : AuthRequirement.publicEndpoint();
    }

    private GlobalRole strongerRole(RequireRole classRole, RequireRole methodRole) {
        if (hasRole(classRole, GlobalRole.ADMIN) || hasRole(methodRole, GlobalRole.ADMIN)) {
            return GlobalRole.ADMIN;
        }
        if (classRole != null || methodRole != null) {
            return GlobalRole.USER;
        }
        return null;
    }

    private boolean hasRole(RequireRole annotation, GlobalRole role) {
        return annotation != null && annotation.value() == role;
    }

    private boolean hasPrincipalParameter(HandlerMethod handlerMethod) {
        for (MethodParameter parameter : handlerMethod.getMethodParameters()) {
            if (parameter.hasParameterAnnotation(LoginUserId.class)
                    || parameter.hasParameterAnnotation(LoginUserSlug.class)) {
                return true;
            }
        }
        return false;
    }

}
