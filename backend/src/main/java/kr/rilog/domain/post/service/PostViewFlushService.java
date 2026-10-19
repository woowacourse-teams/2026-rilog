package kr.rilog.domain.post.service;

import kr.rilog.domain.post.view.PostViewStore;
import kr.rilog.domain.post.view.ViewFlushBatch;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@Slf4j
@RequiredArgsConstructor
public class PostViewFlushService {

    private final PostViewStore postViewStore;
    private final PostViewFlushWriter batchWriter;
    private final AtomicBoolean flushing = new AtomicBoolean();

    public void flushPendingViews() {
        if (!flushing.compareAndSet(false, true)) {
            return;
        }
        try {
            List<ViewFlushBatch> batches = postViewStore.prepareFlushBatches();
            if (batches.isEmpty()) {
                return;
            }
            // 전체 DB 트랜잭션이 커밋된 뒤에만 메모리를 완료하거나 삭제된 글의 Counter를 제거한다.
            Set<Long> excludedPostIds = batchWriter.writeAll(batches);
            for (ViewFlushBatch batch : batches) {
                if (excludedPostIds.contains(batch.postId())) {
                    postViewStore.removeCounter(batch.postId());
                } else {
                    postViewStore.completeFlush(batch.postId(), batch.batchId());
                }
            }
        } catch (RuntimeException exception) {
            log.error("조회수 배치 저장 또는 완료 처리에 실패했습니다. 미완료 배치는 다음 정기 실행에서 재시도합니다.", exception);
        } finally {
            flushing.set(false);
        }
    }
}
