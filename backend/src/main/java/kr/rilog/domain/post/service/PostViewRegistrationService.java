package kr.rilog.domain.post.service;

import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.view.PostViewRegistrationProperties;
import kr.rilog.domain.post.view.PostViewStore;
import kr.rilog.domain.post.view.ViewerIdentity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.post.exception.PostErrorInformation.*;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PostViewRegistrationService {

    private final PostRepository postRepository;
    private final PostViewStore postViewStore;
    private final PostViewRegistrationProperties properties;

    public void register(long postId, Long requesterId, ViewerIdentity viewer) {
        if (!properties.enabled()) {
            throw new PostException(POST_VIEW_REGISTRATION_DISABLED);
        }
        var target = postRepository.findViewTargetById(postId)
                .orElseThrow(() -> new PostException(POST_NOT_FOUND));
        target.validateReadableBy(requesterId);
        if (target.isWrittenBy(requesterId)) {
            return;
        }
        postViewStore.recordView(postId, viewer);
    }
}
