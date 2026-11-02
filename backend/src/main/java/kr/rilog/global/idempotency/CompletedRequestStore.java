package kr.rilog.global.idempotency;

import java.util.function.Supplier;

/**
 * 완료된 요청의 응답을 보관하는 저장소.
 * 같은 키의 동시 호출은 한 번만 실행하고 모두 같은 응답을 받아야 한다.
 * 실행이 예외로 끝나면 응답을 저장하지 않고 그 예외를 그대로 던져야 한다.
 */
public interface CompletedRequestStore {

    Object getOrExecute(RequestKey key, Supplier<Object> execution);
}
