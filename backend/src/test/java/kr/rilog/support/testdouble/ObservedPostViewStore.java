package kr.rilog.support.testdouble;

import kr.rilog.domain.post.view.PostViewCounterRegistry;
import kr.rilog.domain.post.view.PostViewStore;
import kr.rilog.domain.post.view.ViewFlushBatch;
import kr.rilog.domain.post.view.ViewResult;
import kr.rilog.domain.post.view.ViewerIdentity;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * 실제 Registry에 위임하면서 배치 준비 직후와 완료 직전에 테스트 동작을 끼워 넣는 PostViewStore.
 */
public class ObservedPostViewStore implements PostViewStore {

    private static final Runnable NOTHING = () -> { };

    private final PostViewCounterRegistry registry;
    private volatile Runnable beforeCompletion = NOTHING;
    private volatile Runnable afterPreparation = NOTHING;

    public ObservedPostViewStore(PostViewCounterRegistry registry) {
        this.registry = registry;
    }

    public void beforeCompletion(Runnable beforeCompletion) {
        this.beforeCompletion = beforeCompletion;
    }

    public void afterPreparation(Runnable afterPreparation) {
        this.afterPreparation = afterPreparation;
    }

    public void reset() {
        beforeCompletion = NOTHING;
        afterPreparation = NOTHING;
    }

    @Override
    public ViewResult recordView(long postId, ViewerIdentity viewer) {
        return registry.recordView(postId, viewer);
    }

    @Override
    public long currentCount(long postId) {
        return registry.currentCount(postId);
    }

    @Override
    public List<ViewFlushBatch> prepareFlushBatches() {
        List<ViewFlushBatch> batches = registry.prepareFlushBatches().stream()
                .sorted(Comparator.comparingLong(ViewFlushBatch::postId)).toList();
        afterPreparation.run();
        return batches;
    }

    @Override
    public void completeFlush(long postId, UUID batchId) {
        beforeCompletion.run();
        registry.completeFlush(postId, batchId);
    }

}
