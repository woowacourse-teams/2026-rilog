package kr.rilog.global.idempotency;

import kr.rilog.domain.auth.annotation.LoginUserId;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.Arrays;
import java.util.Optional;

@Aspect
@Component
@RequiredArgsConstructor
public class IdempotentRequestAspect {

    private final CompletedRequestStore completedRequests;

    @Around("@annotation(kr.rilog.global.idempotency.IdempotentRequest)")
    public Object executeIdempotently(ProceedingJoinPoint joinPoint) throws Throwable {
        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        Object[] args = joinPoint.getArgs();
        validateDeclaresIdempotencyKey(method);

        Optional<IdempotencyKey> idempotencyKey = findIdempotencyKey(args);
        if (idempotencyKey.isEmpty()) {
            return joinPoint.proceed();
        }

        Long requesterId = findRequesterId(method, args);
        RequestKey key = new RequestKey(method.toGenericString(), requesterId, idempotencyKey.get());

        try {
            return completedRequests.getOrExecute(key, () -> proceed(joinPoint));
        }catch (ProceedFailure failure){
            throw failure.getCause();
        }
    }

    private void validateDeclaresIdempotencyKey(Method method) {
        boolean declared = Arrays.asList(method.getParameterTypes()).contains(IdempotencyKey.class);
        if (!declared) {
            throw new IllegalStateException("@IdempotentRequest 메서드에는 IdempotencyKey 파라미터가 필요합니다: " + method);
        }
    }

    private Optional<IdempotencyKey> findIdempotencyKey(Object[] args) {
        return Arrays.stream(args)
                .filter(IdempotencyKey.class::isInstance)
                .map(IdempotencyKey.class::cast)
                .findFirst();
    }

    private Long findRequesterId(Method method, Object[] args) {
        Parameter[] parameters = method.getParameters();
        for (int index = 0; index < parameters.length; index++) {
            if (parameters[index].isAnnotationPresent(LoginUserId.class)) {
                return (Long) args[index];
            }
        }
        throw new IllegalStateException("@IdempotentRequest 메서드에는 @LoginUserId 파라미터가 필요합니다: " + method);
    }

    private Object proceed(ProceedingJoinPoint joinPoint) {
        try {
            return joinPoint.proceed();
        } catch (Throwable throwable) {
            throw new ProceedFailure(throwable);
        }
    }

    // 저장소의 실행 함수는 checked 예외를 던질 수 없어 감쌌다가 원래 예외로 되돌린다.
    private static final class ProceedFailure extends RuntimeException {
        private ProceedFailure(Throwable cause) {
            super(cause);
        }
    }

}
