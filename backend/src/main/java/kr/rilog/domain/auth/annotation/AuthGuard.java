package kr.rilog.domain.auth.annotation;

import kr.rilog.domain.auth.application.GlobalRole;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuthGuard {

    GlobalRole[] roles() default {};
}
