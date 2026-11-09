package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.entity.vo.ChapterName;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.PostSourceResponse;
import kr.rilog.domain.post.controller.dto.response.owner.CologOwnerResponse;
import kr.rilog.domain.post.controller.dto.response.owner.RilogOwnerResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.entity.vo.PostSource;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.view.PostViewStore;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.JsonNodeFactory;

import java.time.LocalDateTime;
import java.util.Optional;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_MISSING;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostQueryServiceTest {

    private static final Long POST_ID = 1L;
    private static final Long WRITER_ID = 2L;
    private static final Long REQUESTER_ID = 9L;
    private static final Long RILOG_ID = 3L;
    private static final Long COLOG_ID = 4L;
    private static final String RILOG_SLUG = "writer_rilog";
    private static final String COLOG_SLUG = "team_colog";
    private static final LocalDateTime PUBLISHED_AT = LocalDateTime.of(2026, 8, 23, 12, 0);

    @Mock
    private PostRepository postRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    @Mock
    private PostViewStore postViewStore;

    @Mock
    private PostCountCache postCountCache;

    private final JsonNode content = JsonNodeFactory.instance.arrayNode();

    private PostQueryService postQueryService;

    @BeforeEach
    void setUp() {
        postQueryService = new PostQueryService(postRepository, blogMemberRepository, postViewStore, postCountCache);
    }

    @Test
    @DisplayName("개인 블로그의 공개 게시글은 로그인하지 않아도 조회할 수 있다.")
    void readPublicRilogPostAllowsAnonymousUser() {
        // given
        User writer = createWriter();
        writer.completeOnboarding(
                "공개글작성자", "public_writer", "기록하는 개발자입니다.",
                "https://example.com/writer.png", "https://github.com/public_writer", "writer@example.com"
        );
        Post publicPost = createPost(writer, PostVisibility.PUBLIC);
        when(postRepository.findDetailByCanonicalPath(Slug.from(RILOG_SLUG), POST_ID))
                .thenReturn(Optional.of(publicPost));

        // when
        PostDetailResponse response = postQueryService.readPostDetailByCanonicalPath(RILOG_SLUG, POST_ID, null);

        // then
        assertThat(response).isEqualTo(new PostDetailResponse(
                "게시글 제목",
                content,
                PUBLISHED_AT,
                "https://example.com/thumbnail.png",
                Category.TECH.getName(),
                null,
                new PostDetailResponse.AuthorResponse(
                        "공개글작성자", WRITER_ID, "public_writer", "https://example.com/writer.png"
                ),
                new RilogOwnerResponse(
                        BlogType.RILOG, RILOG_ID, RILOG_SLUG, publicPost.getRilog().getName(),
                        publicPost.getRilog().getProfileImageUrl()
                ),
                PostDetailResponse.ViewerPermissionsResponse.none(),
                null
        ));
    }

    @Test
    @DisplayName("게시글 상세에서 연결된 챕터의 ID, 이름과 순서를 반환한다.")
    void readPostDetailMapsChapter() {
        // given
        Post post = createPost(createWriter(), PostVisibility.PUBLIC);
        Chapter chapter = Chapter.builder()
                .id(12L)
                .blog(post.getRilog())
                .name(ChapterName.from("Spring"))
                .order(2)
                .build();
        ReflectionTestUtils.setField(post, "chapter", chapter);
        when(postRepository.findDetailByCanonicalPath(Slug.from(RILOG_SLUG), POST_ID))
                .thenReturn(Optional.of(post));

        // when
        PostDetailResponse response = postQueryService.readPostDetailByCanonicalPath(RILOG_SLUG, POST_ID, null);

        // then
        assertThat(response.chapter()).isEqualTo(new ChapterResponse(12L, "Spring", 2));
    }

    @Test
    @DisplayName("발행된 게시글의 조회수 누계가 없으면 조회수 전용 서버 오류로 분류한다.")
    void readPublicPostFailsWhenViewCountMissing() {
        // given
        Post publicPost = createPost(createWriter(), PostVisibility.PUBLIC);
        when(postRepository.findDetailByCanonicalPath(Slug.from(RILOG_SLUG), POST_ID))
                .thenReturn(Optional.of(publicPost));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                RILOG_ID, WRITER_ID, BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(createMember(publicPost.getRilog(), createWriter(), BlogPermission.OWNER)));
        when(postViewStore.currentCount(POST_ID)).thenThrow(new RilogInfrastructureException(POST_VIEW_COUNT_MISSING));

        // when & then
        assertThatThrownBy(() -> postQueryService.readPostDetailByCanonicalPath(RILOG_SLUG, POST_ID, WRITER_ID))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(POST_VIEW_COUNT_MISSING.getMessage());
    }

    @Test
    @DisplayName("Canonical URL 상세 조회는 postId가 존재해도 URL slug가 게시글 소속 블로그와 다르면 찾을 수 없다.")
    void readPublicPostRejectsMismatchedSlug() {
        // given
        String wrongSlug = "wrong_slug";
        when(postRepository.findDetailByCanonicalPath(Slug.from(wrongSlug), POST_ID))
                .thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> postQueryService.readPostDetailByCanonicalPath(wrongSlug, POST_ID, null))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("개인 블로그 게시글 작성자는 수정과 삭제를 할 수 있다.")
    void readRilogPostAllowsWriterToEditAndDelete() {
        // given
        User writer = createWriter();
        Post publicPost = createPost(writer, PostVisibility.PUBLIC);
        BlogMember requesterMember = createMember(publicPost.getRilog(), writer, BlogPermission.OWNER);
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(publicPost));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                RILOG_ID,
                WRITER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));

        // when
        PostDetailResponse response = postQueryService.readEditablePostDetail(POST_ID, WRITER_ID);

        // then
        assertThat(response.viewerPermissions()).isEqualTo(PostDetailResponse.ViewerPermissionsResponse.of(true, true));
    }

    @Test
    @DisplayName("개인 블로그 게시글 작성자라도 활성 멤버가 아니면 수정과 삭제를 할 수 없다.")
    void readRilogPostRejectsWriterWithoutActiveMember() {
        // given
        User writer = createWriter();
        Post publicPost = createPost(writer, PostVisibility.PUBLIC);
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(publicPost));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                RILOG_ID,
                WRITER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.empty());

        // when
        PostDetailResponse response = postQueryService.readEditablePostDetail(POST_ID, WRITER_ID);

        // then
        assertThat(response.viewerPermissions()).isEqualTo(PostDetailResponse.ViewerPermissionsResponse.none());
    }

    @Test
    @DisplayName("비회원의 팀 블로그 상세 조회는 통계 집계 없이 블로그 정보를 반환한다.")
    void readCologPostReturnsProfileWithoutLoadingStatistics() {
        // given
        User writer = createWriter();
        Post cologPost = createCologPost(writer, PostVisibility.PUBLIC);
        String sourceImageUrl = "https://example.com/source.png";
        ReflectionTestUtils.setField(cologPost, "postType", PostType.PERSONAL_SPOTLIGHT);
        ReflectionTestUtils.setField(cologPost, "description", "핵심 요약");
        ReflectionTestUtils.setField(cologPost, "source", PostSource.create("원본 작성자", sourceImageUrl));
        when(postRepository.findDetailByCanonicalPath(Slug.from(COLOG_SLUG), POST_ID))
                .thenReturn(Optional.of(cologPost));

        // when
        PostDetailResponse response = postQueryService.readPostDetailByCanonicalPath(COLOG_SLUG, POST_ID, null);

        // then
        assertThat(response.owner()).isEqualTo(new CologOwnerResponse(
                BlogType.COLOG, COLOG_ID, COLOG_SLUG, cologPost.getColog().getName(),
                cologPost.getColog().getProfileImageUrl(), cologPost.getColog().getCoverImageUrl()
        ));
        assertThat(response.viewerPermissions()).isEqualTo(PostDetailResponse.ViewerPermissionsResponse.none());
        assertThat(response.postType()).isEqualTo(PostType.PERSONAL_SPOTLIGHT.name());
        assertThat(response.description()).isEqualTo("핵심 요약");
        assertThat(response.source()).isEqualTo(new PostSourceResponse("원본 작성자", sourceImageUrl));
        verify(postRepository).findDetailByCanonicalPath(Slug.from(COLOG_SLUG), POST_ID);
        verifyNoMoreInteractions(postRepository);
        verifyNoInteractions(blogMemberRepository, postViewStore);
    }

    @Test
    @DisplayName("팀 블로그 게시글 작성자가 현재 활성 멤버이면 수정과 삭제를 할 수 있다.")
    void readCologPostAllowsActiveWriterToEditAndDelete() {
        // given
        User writer = createWriter();
        Post cologPost = createCologPost(writer, PostVisibility.PUBLIC);
        BlogMember requesterMember = createMember(cologPost.getColog(), writer, BlogPermission.MEMBER);
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(cologPost));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                WRITER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));
        when(postViewStore.currentCount(POST_ID)).thenReturn(42L);

        // when
        PostDetailResponse response = postQueryService.readEditablePostDetail(POST_ID, WRITER_ID);

        // then
        assertThat(response.viewerPermissions()).isEqualTo(PostDetailResponse.ViewerPermissionsResponse.of(true, true));
        assertThat(response.viewCount()).isEqualTo(42L);
        verify(postRepository).findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED);
        verify(blogMemberRepository).findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID, WRITER_ID, BlogMemberStatus.ACTIVE
        );
        verifyNoMoreInteractions(postRepository, blogMemberRepository);
    }

    @Test
    @DisplayName("팀 블로그 게시글 작성자가 현재 활성 멤버가 아니면 수정과 삭제를 할 수 없다.")
    void readCologPostRejectsLeftWriterPermissions() {
        // given
        User writer = createWriter();
        Post cologPost = createCologPost(writer, PostVisibility.PUBLIC);
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(cologPost));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                WRITER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.empty());

        // when
        PostDetailResponse response = postQueryService.readEditablePostDetail(POST_ID, WRITER_ID);

        // then
        assertThat(response.viewerPermissions()).isEqualTo(PostDetailResponse.ViewerPermissionsResponse.none());
    }

    @Test
    @DisplayName("팀 블로그 관리자는 다른 작성자의 게시글을 삭제할 수 있다.")
    void readCologPostAllowsManagerToDeleteAnotherWritersPost() {
        // given
        User writer = createWriter();
        User requester = createRequester();
        Post cologPost = createCologPost(writer, PostVisibility.PUBLIC);
        BlogMember requesterMember = createMember(cologPost.getColog(), requester, BlogPermission.ADMIN);
        when(postRepository.findDetailByCanonicalPath(Slug.from(COLOG_SLUG), POST_ID))
                .thenReturn(Optional.of(cologPost));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                REQUESTER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));

        // when
        PostDetailResponse response = postQueryService.readPostDetailByCanonicalPath(COLOG_SLUG, POST_ID, REQUESTER_ID);

        // then
        assertThat(response.viewerPermissions()).isEqualTo(PostDetailResponse.ViewerPermissionsResponse.of(false, true));
    }

    @Test
    @DisplayName("블로그의 비공개 게시글은 로그인하지 않으면 조회할 수 없다.")
    void readPrivateBlogPostRejectsAnonymousUser() {
        // given
        User writer = createWriter();
        Post privatePost = createPost(writer, PostVisibility.PRIVATE);
        when(postRepository.findDetailByCanonicalPath(Slug.from(RILOG_SLUG), POST_ID))
                .thenReturn(Optional.of(privatePost));

        // when - then
        assertThatThrownBy(() -> postQueryService.readPostDetailByCanonicalPath(RILOG_SLUG, POST_ID, null))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("블로그의 비공개 게시글은 작성자가 조회할 수 있다.")
    void readPrivateBlogPostAllowsWriter() {
        // given
        User writer = createWriter();
        Post privatePost = createPost(writer, PostVisibility.PRIVATE);
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(privatePost));

        // when
        PostDetailResponse response = postQueryService.readEditablePostDetail(POST_ID, WRITER_ID);

        // then
        assertThat(response.title()).isEqualTo("게시글 제목");
    }

    @Test
    @DisplayName("블로그의 비공개 게시글은 작성자가 아닌 사용자가 조회할 수 없다.")
    void readPrivateBlogPostRejectsNonWriter() {
        // given
        User writer = createWriter();
        Post privatePost = createPost(writer, PostVisibility.PRIVATE);
        when(postRepository.findDetailByCanonicalPath(Slug.from(RILOG_SLUG), POST_ID))
                .thenReturn(Optional.of(privatePost));

        // when - then
        assertThatThrownBy(() -> postQueryService.readPostDetailByCanonicalPath(RILOG_SLUG, POST_ID, 999L))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("게시글이 없으면 canonical 상세 조회는 게시글 없음 예외를 반환한다.")
    void readPublicPostRejectsMissingPost() {
        // given
        when(postRepository.findDetailByCanonicalPath(Slug.from(RILOG_SLUG), POST_ID)).thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> postQueryService.readPostDetailByCanonicalPath(RILOG_SLUG, POST_ID, null))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
        verifyNoInteractions(blogMemberRepository, postViewStore);
    }

    private User createWriter() {
        return User.builder()
                .id(WRITER_ID)
                .githubId(100L)
                .build();
    }

    private User createRequester() {
        return User.builder()
                .id(REQUESTER_ID)
                .githubId(101L)
                .build();
    }

    private Blog createRilog(User owner) {
        return Blog.builder()
                .id(RILOG_ID)
                .owner(owner)
                .slug(Slug.from(RILOG_SLUG))
                .profile(createRilogProfile())
                .blogType(BlogType.RILOG)
                .build();
    }

    private Blog createColog() {
        return Blog.builder()
                .id(COLOG_ID)
                .slug(Slug.from(COLOG_SLUG))
                .profile(createCologProfile())
                .blogType(BlogType.COLOG)
                .build();
    }

    private Post createPost(User writer, PostVisibility visibility) {
        return Post.builder()
                .id(POST_ID)
                .user(writer)
                .rilog(createRilog(writer))
                .title("게시글 제목")
                .content(PostContent.from(content))
                .category(Category.TECH)
                .status(PostStatus.PUBLISHED)
                .visibility(visibility)
                .publishedAt(PUBLISHED_AT)
                .thumbnailImageUrl("https://example.com/thumbnail.png")
                .build();
    }

    private Post createCologPost(User writer, PostVisibility visibility) {
        return Post.builder()
                .id(POST_ID)
                .user(writer)
                .rilog(null)
                .colog(createColog())
                .title("게시글 제목")
                .content(PostContent.from(content))
                .category(Category.TECH)
                .status(PostStatus.PUBLISHED)
                .visibility(visibility)
                .thumbnailImageUrl("https://example.com/thumbnail.png")
                .build();
    }

    private BlogMember createMember(Blog blog, User user, BlogPermission permission) {
        return BlogMember.builder()
                .blog(blog)
                .user(user)
                .permission(permission)
                .status(BlogMemberStatus.ACTIVE)
                .build();
    }

    private Profile createRilogProfile() {
        return Profile.createColog(
                "러로",
                "안녕하세요. 러로입니다. ",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://jinriro.example.com",
                "https://github.com/Wlsflfh",
                "test@test.com"
        );
    }

    private Profile createCologProfile() {
        return Profile.createColog(
                "리로그",
                "세계 최고의 블로그 플랫폼 Rilog. 입니다.",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog",
                "test@test.com"
        );
    }

}
