package kr.rilog.domain.post.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.event.PostCountChangedEvent;
import kr.rilog.domain.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class PostCountCache {

    private static final String KEY = "totalPostsCount";

    private final PostRepository postRepository;
    private final Cache<String, Long> cache = Caffeine.newBuilder()
            .maximumSize(1)
            .build();

    public long getCount() {
        return cache.get(KEY, key -> postRepository.countByStatusAndVisibilityAndDeletedAtIsNull(
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC
        ));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPostCountChanged(PostCountChangedEvent event) {
        cache.invalidate(KEY);
    }
}
