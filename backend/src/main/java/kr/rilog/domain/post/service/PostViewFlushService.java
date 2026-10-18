package kr.rilog.domain.post.service;

import kr.rilog.domain.post.view.PostViewStore;
import kr.rilog.domain.post.view.ViewFlushBatch;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class PostViewFlushService {

    private final PostViewStore postViewStore;
    private final PostViewFlushWriter batchWriter;

    public void flushPendingViews() {
        // 전체 순회는 트랜잭션으로 감싸지 않는다. 게시글별 writer의 커밋이 끝난 뒤 메모리를 완료한다.
        for (ViewFlushBatch batch : postViewStore.prepareFlushBatches()) {
            try {
                batchWriter.write(batch);
                postViewStore.completeFlush(batch.postId(), batch.batchId());
            } catch (RuntimeException exception) {
                postViewStore.discardFlush(batch.postId(), batch.batchId());
                log.error("조회수 배치 저장 또는 완료 처리에 실패하여 증가분을 폐기합니다. batchId={}, postId={}, delta={}",
                        batch.batchId(), batch.postId(), batch.delta(), exception);
            }
        }
    }
}
