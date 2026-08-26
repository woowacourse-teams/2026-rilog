package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.post.service.dto.result.DraftDetailResult;
import kr.rilog.domain.post.service.dto.result.DraftIdResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.*;
import static kr.rilog.domain.post.exception.PostErrorInformation.DRAFT_NOT_FOUND;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@RequiredArgsConstructor
public class DraftService {

    private final PostRepository postRepository;
    private final BlogRepository blogRepository;
    private final UserRepository userRepository;

    // THINK 멱등성.
    public DraftIdResult saveDraft(DraftSaveCommand command, Long writerId) {
        User writer = getUser(writerId);
        Blog rilog = getRilog(writer);

        // TODO 이미지 Confirmed 처리.
        Post saved = postRepository.save(Post.draft(command, writer, rilog));
        return DraftIdResult.from(saved.getId());
    }

    public DraftDetailResult getMyDraft(Long draftId, Long requesterid) {
        Post draft = getDraft(draftId);
        draft.validateWrittenBy(requesterid);
        return DraftDetailResult.from(draft);
    }

    private User getUser(Long requesterId) {
        return userRepository.findById(requesterId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }

    private Blog getRilog(User writer) {
        return blogRepository.findRilogByOwnerId(writer.getId())
                .orElseThrow(() -> new BlogException(RILOG_NOT_FOUND));
    }

    private Post getDraft(Long draftId) {
        return postRepository.findDraftById(draftId)
                .orElseThrow(() -> new PostException(DRAFT_NOT_FOUND));
    }

}
