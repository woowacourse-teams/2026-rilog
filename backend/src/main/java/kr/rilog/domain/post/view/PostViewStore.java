package kr.rilog.domain.post.view;

import java.util.List;
import java.util.UUID;

public interface PostViewStore {

    ViewResult recordView(long postId, ViewerIdentity viewer);

    long currentCount(long postId);

    // 저장 중인 배치는 다시 반환하지 않는다. 반환받은 배치는 성공 또는 폐기로 종료한다.
    List<ViewFlushBatch> prepareFlushBatches();

    void completeFlush(long postId, UUID batchId);

    void discardFlush(long postId, UUID batchId);
}
