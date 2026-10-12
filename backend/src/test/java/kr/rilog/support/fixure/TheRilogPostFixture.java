package kr.rilog.support.fixure;

import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;

import java.time.LocalDateTime;

import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;

public final class TheRilogPostFixture {

    private TheRilogPostFixture() {
    }

    public static Post publishedNews(Chapter chapter, LocalDateTime publishedAt, PostContent content) {
        var blog = chapter.getBlog();
        Post post = Post.createTheRilog(blog, blog.getOwner(),
                new PostDetail("Daily Headlines", content.getContent(), TECH, PUBLIC, null),
                chapter, new TheRilogPostMetadata(PostType.DAILY_HEADLINES, null, null, null));
        return atPublicationTime(post, publishedAt);
    }

    public static Post publishedSpotlight(Chapter chapter, PostType type, LocalDateTime publishedAt) {
        var blog = chapter.getBlog();
        Post post = Post.createTheRilog(blog, blog.getOwner(),
                new PostDetail("기술 블로그 소개", content(paragraph("본문")).getContent(), TECH, PUBLIC, null),
                chapter, new TheRilogPostMetadata(type, "기술 글 요약", "원문 작성자", null));
        return atPublicationTime(post, publishedAt);
    }

    // 발행 시각만 고정하고, 팩토리에서 검증한 나머지 상태는 유지한다.
    private static Post atPublicationTime(Post post, LocalDateTime publishedAt) {
        return Post.builder()
                .user(post.getUser())
                .rilog(post.getRilog())
                .colog(post.getColog())
                .chapter(post.getChapter())
                .postType(post.getPostType())
                .title(post.getTitle())
                .description(post.getDescription())
                .source(post.getSource())
                .content(post.getContent())
                .category(post.getCategory())
                .visibility(post.getVisibility())
                .thumbnailImageUrl(post.getThumbnailImageUrl())
                .status(post.getStatus())
                .publishedAt(publishedAt)
                .build();
    }
}
