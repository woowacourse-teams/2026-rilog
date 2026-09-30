package kr.rilog.domain.post.service.dto.result;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import org.springframework.data.domain.Slice;

import java.time.LocalDateTime;
import java.util.List;

public record FullFeedPostResult(
        List<PostItemResult> posts,
        int page,
        int size,
        int numberOfElements,
        boolean hasNext
) {

    public static FullFeedPostResult from(Slice<PostFullFeedRow> slice) {
        return new FullFeedPostResult(
                slice.getContent().stream()
                        .map(PostItemResult::from)
                        .toList(),
                slice.getNumber(),
                slice.getSize(),
                slice.getNumberOfElements(),
                slice.hasNext()
        );
    }

    public record PostItemResult(
            Long postId,
            String title,
            String thumbnailImageUrl,
            Category category,
            PostVisibility visibility,
            LocalDateTime publishedAt,
            long totalCommentsCount,
            Long chapterId,
            String chapterName,
            Integer chapterOrder,
            Long authorId,
            String authorNickname,
            String authorSlug,
            String authorProfileImageUrl,
            BlogType ownerType,
            Long ownerId,
            String ownerSlug,
            String ownerName,
            String ownerProfileImageUrl
    ) {

        private static PostItemResult from(PostFullFeedRow row) {
            return new PostItemResult(
                    row.postId(),
                    row.title(),
                    row.thumbnailImageUrl(),
                    row.category(),
                    row.visibility(),
                    row.publishedAt(),
                    row.inlineCommentCount(),
                    row.chapterId(),
                    row.chapterName(),
                    row.chapterOrder(),
                    row.authorId(),
                    row.authorNickname(),
                    row.authorSlug(),
                    row.authorProfileImageUrl(),
                    row.ownerType(),
                    row.ownerId(),
                    row.ownerSlug(),
                    row.ownerName(),
                    row.ownerProfileImageUrl()
            );
        }
    }
}
