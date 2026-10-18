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
                log.error("조회수 배치 저장에 실패했습니다. 다음 실행에서 재시도합니다. batchId={}, postId={}, delta={}",
                        batch.batchId(), batch.postId(), batch.delta(), exception);
            }
        }
    }
}
