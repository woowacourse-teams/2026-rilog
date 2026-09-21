package kr.rilog.domain.comment.service;

import kr.rilog.domain.comment.entity.CommentAnchor;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
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

import java.util.List;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentAnchorService {

    private final CommentAnchorRepository commentAnchorRepository;
    private final CommentAnchorSelectionRepository commentAnchorSelectionRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public CommentAnchorCreateResult createCommentAnchor(
            Long postId,
            Long requesterId,
            CommentAnchorCreateCommand command
    ) {
        Post post = getPublishedPost(postId);
        post.validateReadableBy(requesterId);
        User writer = getUser(requesterId);

        Selection selection = createSelection(post, command);
        CommentAnchorSelection anchorSelection = getOrCreateActiveSelection(post, selection);
        CommentAnchor commentAnchor = CommentAnchor.create(anchorSelection, writer, command.content());
        CommentAnchor savedCommentAnchor = commentAnchorRepository.save(commentAnchor);
        return CommentAnchorCreateResult.from(savedCommentAnchor);
    }

    private CommentAnchorSelection getOrCreateActiveSelection(Post post, Selection selection) {
        List<CommentAnchorSelection> activeSelections = commentAnchorSelectionRepository.findAllActiveBySelection(
                post.getId(),
                selection.getBlockId(),
                selection.getRange().getStartOffset(),
                selection.getRange().getEndOffset(),
                selection.getSelectedText()
        );

        if (!activeSelections.isEmpty()) {
            return activeSelections.getFirst(); // NOTE 동시성 문제로 List 조회 후 getFirst() 임시 사용
        }

        return commentAnchorSelectionRepository.save(CommentAnchorSelection.create(post, selection));
    }

    private Post getPublishedPost(Long postId) {
        return postRepository.findDetailByIdAndStatus(postId, PostStatus.PUBLISHED)
                .orElseThrow(() -> new PostException(POST_NOT_FOUND));
    }

    private User getUser(Long requesterId) {
        return userRepository.findById(requesterId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }

    private Selection createSelection(Post post, CommentAnchorCreateCommand command) {
        TextBlock block = post.findTextBlock(command.blockId());
        return Selection.select(
                block,
                command.startOffset(),
                command.endOffset(),
                command.selectedText()
        );
    }

}
