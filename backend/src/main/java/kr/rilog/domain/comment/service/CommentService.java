package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.comment.controller.dto.response.CommentCreateResponse;
import kr.rilog.domain.comment.controller.dto.response.CommentListResponse;
import kr.rilog.domain.comment.entity.Comment;
import kr.rilog.domain.comment.exception.CommentException;
import kr.rilog.domain.comment.repository.CommentRepository;
import kr.rilog.domain.comment.service.dto.command.CommentCreateCommand;
import kr.rilog.domain.comment.service.dto.command.CommentUpdateCommand;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import static kr.rilog.domain.comment.exception.CommentErrorInformation.COMMENT_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final BlogMemberRepository blogMemberRepository;
    private final Clock clock;

    public CommentListResponse readComments(Long postId) {
        Post post = getPublishedPost(postId);
        Set<Long> activeMemberUserIds = new HashSet<>(
                blogMemberRepository.findActiveUserIdsByBlogId(post.getOwnBlogId())
        );
        return CommentListResponse.from(
                post,
                commentRepository.findAllByPostIdOrderByCreatedAtAscIdAsc(postId),
                activeMemberUserIds
        );
    }

    @Transactional
    public CommentCreateResponse createComment(Long postId, Long requesterId, CommentCreateCommand command) {
        Post post = getPublishedPost(postId);
        User user = getUser(requesterId);
        Comment comment = Comment.createRoot(post, user, command.content());
        return CommentCreateResponse.from(commentRepository.save(comment));
    }

    @Transactional
    public CommentCreateResponse createReply(
            Long postId,
            Long parentCommentId,
            Long requesterId,
            CommentCreateCommand command
    ) {
        Post post = getPublishedPost(postId);
        User user = getUser(requesterId);
        Comment parent = getComment(parentCommentId);
        validateCommentBelongsToPost(parent, post);
        Comment reply = Comment.createReply(parent, user, command.content());
        return CommentCreateResponse.from(commentRepository.save(reply));
    }

    @Transactional
    public void updateComment(Long commentId, Long requesterId, CommentUpdateCommand command) {
        Comment comment = getComment(commentId);
        comment.updateContent(requesterId, command.content());
    }

    @Transactional
    public void deleteComment(Long commentId, Long requesterId) {
        Comment comment = getComment(commentId);
        comment.deleteBy(requesterId);

        if (!comment.isReply()) {
            commentRepository.softDeleteAllRepliesByParentId(commentId, LocalDateTime.now(clock));
        }
    }

    private Post getPublishedPost(Long postId) {
        Post post = postRepository.findDetailByIdAndStatus(postId, PostStatus.PUBLISHED)
                .orElseThrow(() -> new PostException(POST_NOT_FOUND));
        post.validateReadableBy(null);
        return post;
    }

    private User getUser(Long requesterId) {
        return userRepository.findById(requesterId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }

    private Comment getComment(Long commentId) {
        return commentRepository.findByIdAndDeletedAtIsNull(commentId)
                .orElseThrow(() -> new CommentException(COMMENT_NOT_FOUND));
    }

    private void validateCommentBelongsToPost(Comment comment, Post post) {
        if (!comment.belongsTo(post.getId())) {
            throw new CommentException(COMMENT_NOT_FOUND);
        }
    }
}
