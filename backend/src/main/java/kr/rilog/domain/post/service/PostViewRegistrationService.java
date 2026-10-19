package kr.rilog.domain.post.service;

import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.repository.projection.PostViewTarget;
import kr.rilog.domain.post.view.PostViewRegistrationProperties;
import kr.rilog.domain.post.view.PostViewStore;
import kr.rilog.domain.post.view.ViewerIdentity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PostViewRegistrationService {

    private final PostRepository postRepository;
    private final PostViewStore postViewStore;
    private final PostViewRegistrationProperties properties;

    public void register(long postId, Long requesterId, ViewerIdentity viewer) {
        properties.validateRegistrationEnabled();

        var target = postRepository.findViewTargetById(postId)
                .orElseThrow(() -> new PostException(POST_NOT_FOUND));
        target.validateReadableBy(requesterId);
        registerViewExcludingAuthor(target, requesterId, viewer);
    }

    private void registerViewExcludingAuthor(PostViewTarget target, Long requesterId, ViewerIdentity viewer) {
        if (target.isWrittenBy(requesterId)) {
            return;
        }
        postViewStore.recordView(target.postId(), viewer);
    }
}
