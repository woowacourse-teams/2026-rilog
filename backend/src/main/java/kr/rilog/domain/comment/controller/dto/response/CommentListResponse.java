package kr.rilog.domain.comment.controller.dto.response;

import kr.rilog.domain.comment.entity.Comment;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.user.entity.User;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public record CommentListResponse(
        List<CommentResponse> comments
) {

    public static CommentListResponse from(Post post, List<Comment> comments, Set<Long> activeMemberUserIds) {
        Map<Long, List<Comment>> repliesByParentId = comments.stream()
                .filter(Comment::isReply)
                .filter(comment -> !comment.isDeleted())
                .collect(Collectors.groupingBy(
                        comment -> comment.getParent().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<CommentResponse> rootComments = comments.stream()
                .filter(comment -> !comment.isReply())
                .filter(comment -> shouldShowRootComment(comment, repliesByParentId))
                .map(comment -> CommentResponse.from(
                        post,
                        comment,
                        activeMemberUserIds,
                        repliesByParentId.getOrDefault(comment.getId(), List.of())
                ))
                .toList();

        return new CommentListResponse(rootComments);
    }

    private static boolean shouldShowRootComment(Comment comment, Map<Long, List<Comment>> repliesByParentId) {
        return !comment.isDeleted() || !repliesByParentId.getOrDefault(comment.getId(), List.of()).isEmpty();
    }

    public record CommentResponse(
            Long commentId,
            String content,
            boolean deleted,
            AuthorResponse author,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            int replyCount,
            List<ReplyResponse> replies
    ) {

        private static CommentResponse from(
                Post post,
                Comment comment,
                Set<Long> activeMemberUserIds,
                List<Comment> replies
        ) {
            if (comment.isDeleted()) {
                return new CommentResponse(
                        comment.getId(),
                        null,
                        true,
                        null,
                        comment.getCreatedAt(),
                        comment.getUpdatedAt(),
                        replies.size(),
                        replies.stream()
                                .map(reply -> ReplyResponse.from(post, reply, activeMemberUserIds))
                                .toList()
                );
            }

            return new CommentResponse(
                    comment.getId(),
                    comment.getContent(),
                    false,
                    AuthorResponse.from(post, comment.getUser(), activeMemberUserIds),
                    comment.getCreatedAt(),
                    comment.getUpdatedAt(),
                    replies.size(),
                    replies.stream()
                            .map(reply -> ReplyResponse.from(post, reply, activeMemberUserIds))
                            .toList()
            );
        }
    }

    public record ReplyResponse(
            Long commentId,
            String content,
            AuthorResponse author,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {

        private static ReplyResponse from(Post post, Comment comment, Set<Long> activeMemberUserIds) {
            return new ReplyResponse(
                    comment.getId(),
                    comment.getContent(),
                    AuthorResponse.from(post, comment.getUser(), activeMemberUserIds),
                    comment.getCreatedAt(),
                    comment.getUpdatedAt()
            );
        }
    }

    public record AuthorResponse(
            Long userId,
            String nickname,
            String slug,
            String profileImageUrl,
            boolean postAuthor,
            boolean blogMember
    ) {

        private static AuthorResponse from(Post post, User user, Set<Long> activeMemberUserIds) {
            return new AuthorResponse(
                    user.getId(),
                    user.getNickname(),
                    user.getSlug(),
                    user.getProfileImageUrl(),
                    post.isWrittenBy(user.getId()),
                    activeMemberUserIds.contains(user.getId())
            );
        }
    }
}
