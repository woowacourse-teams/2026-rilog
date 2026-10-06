package kr.rilog.domain.post.view;

/**
 * Counter의 락 안에서 호출하는 방문 기록 저장소.
 * 조회·기록·조회수 증가를 묶는 원자성은 호출자가 보장한다.
 */
public interface ViewerRecordStore {

    Long lastAcceptedTick(ViewerIdentity viewer);

    void recordAccepted(ViewerIdentity viewer, long acceptedTick);

    void cleanupExpired(long nowTick);
}
