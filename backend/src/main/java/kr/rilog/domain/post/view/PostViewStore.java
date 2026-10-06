package kr.rilog.domain.post.view;

import java.util.List;
import java.util.UUID;

public interface PostViewStore {

    ViewResult recordView(long postId, ViewerIdentity viewer);

    long currentCount(long postId);

    List<ViewFlushBatch> prepareFlushBatches();

    void completeFlush(long postId, UUID batchId);
}
