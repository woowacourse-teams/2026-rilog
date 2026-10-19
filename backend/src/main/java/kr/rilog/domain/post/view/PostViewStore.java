package kr.rilog.domain.post.view;

import java.util.List;
import java.util.UUID;

public interface PostViewStore {

    ViewResult recordView(long postId, ViewerIdentity viewer);

    long currentCount(long postId);

    // 미완료 배치를 재반환한다. 저장 실행의 겹침 방지는 호출자가 보장한다.
    List<ViewFlushBatch> prepareFlushBatches();

    void completeFlush(long postId, UUID batchId);
}
