package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.post.controller.dto.response.owner.CologOwnerResponse;
import kr.rilog.domain.post.controller.dto.response.owner.RilogOwnerResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static org.assertj.core.api.Assertions.assertThat;

class PostDetailResponseTest {

    @Test
    @DisplayName("Rilog 소속 게시글의 owner는 Rilog 정보로 생성된다.")
    void fromRilog() {
        // given
        Post post = publicPost(PostType.STANDARD);
        Blog blog = post.getRilog();

        // when
        PostDetailResponse response = detailResponse(post);

        // then
        assertThat(response.owner()).isEqualTo(new RilogOwnerResponse(
                BlogType.RILOG, blog.getId(), blog.getSlug(), blog.getName(), blog.getProfileImageUrl()));
    }

    @Test
    @DisplayName("Colog 소속 게시글의 owner는 Colog 정보로 생성된다.")
    void fromColog() {
        // given
        Post post = publicPost(PostType.STANDARD);
        Blog colog = Blog.createColog(post.getUser(), "team_colog", BlogFixture.cologProfile());
        post.update(detail(), colog);

        // when
        PostDetailResponse response = PostDetailResponse.fromColog(
                post, 3L, 5L, PostDetailResponse.ViewerPermissionsResponse.none(), 42L);

        // then
        assertThat(response.owner()).isEqualTo(new CologOwnerResponse(
                BlogType.COLOG, colog.getId(), colog.getSlug(), colog.getName(),
                colog.getProfileImageUrl(), colog.getCoverImageUrl(), 3L, 5L));
    }

    @Test
    @DisplayName("게시글 상세 응답은 조회수를 반환한다.")
    void responseReturnsViewCount() {
        // given
        Post post = publicPost(PostType.STANDARD);

        // when
        PostDetailResponse response = detailResponse(post);

        // then
        assertThat(response.viewCount()).isEqualTo(42L);
    }

    @Test
    @DisplayName("게시글 상세 응답은 본문을 기존 JSON 형식으로 반환한다.")
    void responsePreservesJsonContent() {
        // given
        Post post = publicPost(PostType.STANDARD);

        // when
        PostDetailResponse response = detailResponse(post);

        // then
        assertThat(response.content()).isEqualTo(detail().content());
    }

    @ParameterizedTest
    @EnumSource(PostType.class)
    @DisplayName("게시글 상세 응답은 저장된 게시글 유형을 반환한다.")
    void responseReturnsStoredPostType(PostType type) {
        // given
        Post post = publicPost(type);

        // when
        PostDetailResponse response = detailResponse(post);

        // then
        assertThat(response.postType()).isEqualTo(type.name());
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"STANDARD", "DAILY_HEADLINES"})
    @DisplayName("일반 글과 뉴스의 상세 응답은 요약 설명이 비어 있다.")
    void responseLeavesDescriptionEmptyForNonSpotlights(PostType type) {
        // given
        Post post = publicPost(type);

        // when
        PostDetailResponse response = detailResponse(post);

        // then
        assertThat(response.description()).isNull();
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"STANDARD", "DAILY_HEADLINES"})
    @DisplayName("일반 글과 뉴스의 상세 응답은 출처가 비어 있다.")
    void responseLeavesSourceEmptyForNonSpotlights(PostType type) {
        // given
        Post post = publicPost(type);

        // when
        PostDetailResponse response = detailResponse(post);

        // then
        assertThat(response.source()).isNull();
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("스포트라이트 상세 응답은 저장된 요약 설명을 반환한다.")
    void responseReturnsSpotlightDescription(PostType type) {
        // given
        Post post = publicPost(type);

        // when
        PostDetailResponse response = detailResponse(post);

        // then
        assertThat(response.description()).isEqualTo("핵심 요약");
    }

    @ParameterizedTest
    @EnumSource(value = PostType.class, names = {"ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT"})
    @DisplayName("스포트라이트 상세 응답은 저장된 출처 프로필을 반환한다.")
    void responseReturnsSpotlightSourceProfile(PostType type) {
        // given
        Post post = publicPost(type);

        // when
        PostDetailResponse response = detailResponse(post);

        // then
        assertThat(response.source()).isEqualTo(new PostSourceResponse("출처 이름", "https://example.com/source.png"));
    }

    @Test
    @DisplayName("스포트라이트의 출처 이미지를 생략해도 상세 응답은 출처 이름을 반환한다.")
    void responseReturnsSourceWithoutImage() {
        // given
        var writer = UserFixture.completedWithNicknameAndSlug("편집자", "the_rilog");
        Blog blog = Blog.createRilog(writer);
        Post post = Post.createTheRilog(blog, writer, detail(), Chapter.create(blog, "spotlights", 0),
                new TheRilogPostMetadata(PostType.PERSONAL_SPOTLIGHT, "핵심 요약", "개발자", null));

        // when
        PostDetailResponse response = detailResponse(post);

        // then
        assertThat(response.source()).isEqualTo(new PostSourceResponse("개발자", null));
    }

    @Test
    @DisplayName("Colog로 이동한 스포트라이트도 상세 응답에서 출처 프로필을 반환한다.")
    void responsePreservesSourceForTransferredSpotlight() {
        // given
        Post post = publicPost(PostType.PERSONAL_SPOTLIGHT);
        Blog colog = Blog.createColog(post.getUser(), "team_colog", BlogFixture.cologProfile());
        post.update(detail(), colog);

        // when
        PostDetailResponse response = PostDetailResponse.fromColog(
                post, 3L, 5L, PostDetailResponse.ViewerPermissionsResponse.none(), 42L);

        // then
        assertThat(response.source()).isEqualTo(new PostSourceResponse("출처 이름", "https://example.com/source.png"));
    }

    private Post publicPost(PostType type) {
        var writer = UserFixture.completedWithNicknameAndSlug("편집자", "the_rilog");
        Blog blog = Blog.createRilog(writer);
        if (type == PostType.STANDARD) {
            return Post.create(blog, writer, detail(), null);
        }
        Chapter chapter = Chapter.create(blog, type.isSpotlight() ? "spotlights" : "headlines", 0);
        TheRilogPostMetadata metadata = type.isSpotlight()
                ? new TheRilogPostMetadata(type, "핵심 요약", "출처 이름", "https://example.com/source.png")
                : new TheRilogPostMetadata(type, null, null, null);
        return Post.createTheRilog(blog, writer, detail(), chapter, metadata);
    }

    private PostDetail detail() {
        return new PostDetail("게시글 제목", content(paragraph("본문")).getContent(), TECH, PUBLIC, null);
    }

    private PostDetailResponse detailResponse(Post post) {
        return PostDetailResponse.fromRilog(post, PostDetailResponse.ViewerPermissionsResponse.none(), 42L);
    }
}
