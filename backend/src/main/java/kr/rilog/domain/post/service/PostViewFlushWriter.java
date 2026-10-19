package kr.rilog.domain.post.service;

import kr.rilog.domain.post.view.ViewFlushBatch;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.global.exception.RilogInfrastructureException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_INVALID;

@Service
@RequiredArgsConstructor
public class PostViewFlushWriter {

    private final PostViewCountRepository countRepository;
    private final PostRepository postRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Set<Long> writeAll(List<ViewFlushBatch> batches) {
        Set<Long> excludedPostIds = new HashSet<>();
        for (ViewFlushBatch batch : batches) {
            if (countRepository.increaseBy(batch.postId(), batch.delta()) == 1) {
                continue;
            }
            if (!postRepository.existsByIdAndDeletedAtIsNull(batch.postId())) {
                excludedPostIds.add(batch.postId());
                continue;
            }
            throw new RilogInfrastructureException(POST_VIEW_COUNT_INVALID);
        }
        return Set.copyOf(excludedPostIds);
    }
}
