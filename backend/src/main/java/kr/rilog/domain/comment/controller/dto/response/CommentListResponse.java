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
                .filter(reply -> !reply.isDeleted())
                .collect(Collectors.groupingBy(
                        reply -> reply.getParent().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<CommentResponse> rootComments = comments.stream()
                .filter(root -> !root.isReply())
                .filter(root -> !root.isDeleted())
                .map(root -> CommentResponse.from(
                        post,
                        root,
                        activeMemberUserIds,
                        repliesByParentId.getOrDefault(root.getId(), List.of())
                ))
                .toList();

        return new CommentListResponse(rootComments);
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
                Comment root,
                Set<Long> activeMemberUserIds,
                List<Comment> replies
        ) {
            return new CommentResponse(
                    root.getId(),
                    root.getContent(),
                    false,
                    AuthorResponse.from(post, root.getUser(), activeMemberUserIds),
                    root.getCreatedAt(),
                    root.getUpdatedAt(),
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

        private static ReplyResponse from(Post post, Comment reply, Set<Long> activeMemberUserIds) {
            return new ReplyResponse(
                    reply.getId(),
                    reply.getContent(),
                    AuthorResponse.from(post, reply.getUser(), activeMemberUserIds),
                    reply.getCreatedAt(),
                    reply.getUpdatedAt()
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
