package kr.rilog.domain.upload.service.gateway;

/**
 * 사용 확정된 raw 원본({root}/{images|profiles}/raw/{userId}-{UUID}/original.{ext})의 압축본을 만든다.
 * 압축 너비와 압축본 key({root}/{images|profiles}/compact/{userId}-{UUID}/{width}.webp)는 구현체 쪽이 정한다.
 *
 * <p>압축은 화면 표시를 위한 부가 작업이다. 실패해도 예외를 던지지 않고 기록만 하며 다시 시도하지 않는다.
 * 압축본이 없으면 프론트엔드가 원본을 표시한다.
 */
public interface ImageCompactionGateway {

    void compact(String rawObjectKey);

}
