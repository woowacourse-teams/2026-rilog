package kr.rilog.domain.comment.service;

import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.service.dto.command.CommentAnchorCreateCommand;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorCreateResult;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.vo.TextBlock;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentAnchorService {

    /*
     * TODO: CommentAnchorSelection 재사용 정책과 함께 인라인 댓글 생성 API를 다시 구현한다.
     * 현재는 CommentAnchorSelection 엔티티 마이그레이션만 적용하므로 생성 유스케이스를 비활성화한다.
    private final CommentAnchorRepository commentAnchorRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public CommentAnchorCreateResult createCommentAnchor(Long postId, Long requesterId, CommentAnchorCreateCommand command) {
        Post post = getPublishedPost(postId);
        post.validateReadableBy(requesterId);
        User writer = getUser(requesterId);

        TextBlock block = post.findTextBlock(command.blockId());
        CommentAnchorSelection selection = CommentAnchorSelection.select(
                block,
                command.startOffset(),
                command.endOffset(),
                command.selectedText()
        );

        CommentAnchor commentAnchor = CommentAnchor.create(
                post,
                writer,
                selection,
                command.content()
        );
        CommentAnchor savedCommentAnchor = commentAnchorRepository.save(commentAnchor);
        return CommentAnchorCreateResult.from(savedCommentAnchor);
    }

    private Post getPublishedPost(Long postId) {
        return postRepository.findDetailByIdAndStatus(postId, PostStatus.PUBLISHED)
                .orElseThrow(() -> new PostException(POST_NOT_FOUND));
    }

    private User getUser(Long requesterId) {
        return userRepository.findById(requesterId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }
    */

}
