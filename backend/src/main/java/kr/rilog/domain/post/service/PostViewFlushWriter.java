package kr.rilog.domain.post.service;

import kr.rilog.domain.post.view.ViewFlushBatch;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.global.exception.RilogInfrastructureException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_INVALID;

@Service
@RequiredArgsConstructor
public class PostViewFlushWriter {

    private final PostViewCountRepository countRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void write(ViewFlushBatch batch) {
        if (countRepository.increaseBy(batch.postId(), batch.delta()) != 1) {
            throw new RilogInfrastructureException(POST_VIEW_COUNT_INVALID);
        }
    }
}
