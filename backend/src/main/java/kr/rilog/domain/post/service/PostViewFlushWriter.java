package kr.rilog.domain.post.service;

import kr.rilog.domain.post.view.ViewFlushBatch;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.post.repository.PostViewFlushBatchRepository;
import kr.rilog.global.exception.RilogInfrastructureException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_INVALID;

@Service
@RequiredArgsConstructor
public class PostViewFlushWriter {

    private final PostViewFlushBatchRepository batchRepository;
    private final PostViewCountRepository countRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void write(ViewFlushBatch batch) {
        var appliedBatch = batchRepository.findById(batch.batchId().toString());
        if (appliedBatch.isPresent()) {
            appliedBatch.get().validateMatches(batch);
            return;
        }

        // 이력의 PK로 중복을 막는다. 동시 INSERT 충돌은 트랜잭션 전체를 롤백하고 다음 주기에 재시도한다.
        batchRepository.insert(batch.batchId().toString(), batch.postId(), batch.delta(),
                LocalDateTime.ofInstant(batch.createdAt(), ZoneOffset.UTC));
        if (countRepository.increaseBy(batch.postId(), batch.delta()) != 1) {
            throw new RilogInfrastructureException(POST_VIEW_COUNT_INVALID);
        }
    }
}
