package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.owner.CologOwnerResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.blog.entity.vo.Slug;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.JsonNodeFactory;

import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.COLOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_DELETE_FORBIDDEN;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long POST_ID = 1L;
    private static final Long WRITER_ID = 2L;
    private static final Long REQUESTER_ID = 9L;
    private static final Long RILOG_ID = 3L;
    private static final Long COLOG_ID = 4L;
    private static final String RILOG_SLUG = "writer-rilog";
    private static final String COLOG_SLUG = "team-colog";

    @Mock
    private PostRepository postRepository;

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ChapterRepository chapterRepository;

    @Mock
    private TagAssetsPublisher tagAssetsPublisher;

    private final JsonNode content = JsonNodeFactory.instance.arrayNode();

    private PostService postService;

    @BeforeEach
    void setUp() {
        postService = new PostService(
                postRepository,
                blogRepository,
                blogMemberRepository,
                userRepository,
                chapterRepository,
                tagAssetsPublisher
        );
    }

    @Test
    @DisplayName("개인 블로그에 게시글을 발행하면 해당 개인 블로그에만 게시글을 발행한다")
    void publishToRilogPublishesOnlyToRilog() {
        // given
        User writer = createWriter();
        Blog rilog = createRilog(writer);
        PostSaveCommand command = createCommand(RILOG_SLUG);
        Post savedPost = Post.builder()
                .id(POST_ID)
                .content(PostContent.from(command.content()))
                .thumbnailImageUrl(command.thumbnailImageUrl())
                .build();

        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(RILOG_SLUG))).thenReturn(Optional.of(rilog));
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(postRepository.save(any(Post.class))).thenReturn(savedPost);

        // when
        PostPublishResult result = postService.publish(command, WRITER_ID);

        // then
        ArgumentCaptor<Post> postCaptor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(postCaptor.capture());
        Post publishedPost = postCaptor.getValue();

        assertThat(publishedPost.getUser()).isSameAs(writer);
        assertThat(publishedPost.getRilog()).isSameAs(rilog);
        assertThat(publishedPost.getColog()).isNull();
        assertThat(result).isEqualTo(new PostPublishResult(POST_ID, RILOG_SLUG));
    }

    @Test
    @DisplayName("팀 블로그에 게시글을 발행하면 팀 블로그와 작성자의 개인 블로그에 함께 게시글을 발행한다")
    void publishToCologPublishesToCologAndWriterRilog() {
        // given
        User writer = createWriter();
        Blog colog = createColog();
        Blog rilog = createRilog(writer);
        PostSaveCommand command = createCommand(COLOG_SLUG);
        Post savedPost = Post.builder()
                .id(POST_ID)
                .content(PostContent.from(command.content()))
                .thumbnailImageUrl(command.thumbnailImageUrl())
                .build();

        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(COLOG_SLUG))).thenReturn(Optional.of(colog));
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(blogMemberRepository.existsByBlogIdAndUserIdAndStatus(COLOG_ID, WRITER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(true);
        when(blogRepository.findRilogByOwnerId(WRITER_ID)).thenReturn(Optional.of(rilog));
        when(postRepository.save(any(Post.class))).thenReturn(savedPost);

        // when
        PostPublishResult result = postService.publish(command, WRITER_ID);

        // then
        ArgumentCaptor<Post> postCaptor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(postCaptor.capture());
        Post publishedPost = postCaptor.getValue();

        assertThat(publishedPost.getUser()).isSameAs(writer);
        assertThat(publishedPost.getRilog()).isSameAs(rilog);
        assertThat(publishedPost.getColog()).isSameAs(colog);
        assertThat(result).isEqualTo(new PostPublishResult(POST_ID, COLOG_SLUG));
    }

    @Test
    @DisplayName("팀 블로그의 활성 멤버가 아니면 팀 블로그에 게시글을 발행할 수 없다")
    void publishToCologFailsWhenWriterIsNotActiveMember() {
        // given
        User writer = createWriter();
        Blog colog = createColog();
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(COLOG_SLUG))).thenReturn(Optional.of(colog));
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(blogMemberRepository.existsByBlogIdAndUserIdAndStatus(COLOG_ID, WRITER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(false);

        // when - then
        assertThatThrownBy(() -> postService.publish(createCommand(COLOG_SLUG), WRITER_ID))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(COLOG_POST_PUBLISH_FORBIDDEN);
        verify(blogRepository, never()).findRilogByOwnerId(WRITER_ID);
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    @DisplayName("발행할 블로그가 존재하지 않으면 게시글 발행에 실패한다")
    void publishFailsWhenPublishingBlogDoesNotExist() {
        // given
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(RILOG_SLUG))).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> postService.publish(createCommand(RILOG_SLUG), WRITER_ID))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_NOT_FOUND);
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    @DisplayName("작성자가 존재하지 않으면 게시글 발행에 실패한다")
    void publishFailsWhenWriterDoesNotExist() {
        // given
        User rilogOwner = createWriter();
        Blog rilog = createRilog(rilogOwner);
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(RILOG_SLUG))).thenReturn(Optional.of(rilog));
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> postService.publish(createCommand(RILOG_SLUG), WRITER_ID))
                .isInstanceOf(UserException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(USER_NOT_FOUND);
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    @DisplayName("팀 블로그에 발행할 때 작성자의 개인 블로그가 없으면 게시글 발행에 실패한다")
    void publishToCologFailsWhenWriterRilogDoesNotExist() {
        // given
        User writer = createWriter();
        Blog colog = createColog();
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(COLOG_SLUG))).thenReturn(Optional.of(colog));
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(blogMemberRepository.existsByBlogIdAndUserIdAndStatus(COLOG_ID, WRITER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(true);
        when(blogRepository.findRilogByOwnerId(WRITER_ID)).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> postService.publish(createCommand(COLOG_SLUG), WRITER_ID))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(RILOG_NOT_FOUND);
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    @DisplayName("다른 사용자의 개인 블로그에는 게시글을 발행할 수 없다")
    void publishToRilogFailsWhenWriterIsNotOwner() {
        // given
        Long notOwnerId = 5L;
        User writer = createWriter();
        User rilogOwner = User.builder()
                .id(notOwnerId)
                .githubId(200L)
                .build();
        Blog rilog = createRilog(rilogOwner);
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(RILOG_SLUG))).thenReturn(Optional.of(rilog));
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));

        // when - then
        assertThatThrownBy(() -> postService.publish(createCommand(RILOG_SLUG), WRITER_ID))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(RILOG_POST_PUBLISH_FORBIDDEN);
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    @DisplayName("개인 블로그의 공개 게시글은 로그인하지 않아도 조회할 수 있다")
    void readPublicRilogPostAllowsAnonymousUser() {
        // given
        User writer = createWriter();
        Post publicPost = createPost(writer, PostVisibility.PUBLIC);
        when(postRepository.findDetailById(POST_ID))
                .thenReturn(Optional.of(publicPost));

        // when
        PostDetailResponse response = postService.readPostOfBlogs(POST_ID, null);

        // then
        assertThat(response.title()).isEqualTo("게시글 제목");
        assertThat(response.owner().type()).isEqualTo(BlogType.RILOG);
        assertThat(response.viewerPermissions().canEdit()).isFalse();
        assertThat(response.viewerPermissions().canDelete()).isFalse();
    }

    @Test
    @DisplayName("개인 블로그 게시글 작성자는 수정과 삭제를 할 수 있다")
    void readRilogPostAllowsWriterToEditAndDelete() {
        // given
        User writer = createWriter();
        Post publicPost = createPost(writer, PostVisibility.PUBLIC);
        BlogMember requesterMember = createMember(publicPost.getRilog(), writer, BlogPermission.OWNER);
        when(postRepository.findDetailById(POST_ID))
                .thenReturn(Optional.of(publicPost));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                RILOG_ID,
                WRITER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));

        // when
        PostDetailResponse response = postService.readPostOfBlogs(POST_ID, WRITER_ID);

        // then
        assertThat(response.viewerPermissions().canEdit()).isTrue();
        assertThat(response.viewerPermissions().canDelete()).isTrue();
    }

    @Test
    @DisplayName("개인 블로그 게시글 작성자라도 활성 멤버가 아니면 수정과 삭제를 할 수 없다")
    void readRilogPostRejectsWriterWithoutActiveMember() {
        // given
        User writer = createWriter();
        Post publicPost = createPost(writer, PostVisibility.PUBLIC);
        when(postRepository.findDetailById(POST_ID))
                .thenReturn(Optional.of(publicPost));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                RILOG_ID,
                WRITER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.empty());

        // when
        PostDetailResponse response = postService.readPostOfBlogs(POST_ID, WRITER_ID);

        // then
        assertThat(response.viewerPermissions().canEdit()).isFalse();
        assertThat(response.viewerPermissions().canDelete()).isFalse();
    }

    @Test
    @DisplayName("팀 블로그 게시글을 조회하면 활성 멤버 수와 공개 게시글 수를 포함한다")
    void readCologPostContainsMemberAndPostCounts() {
        // given
        User writer = createWriter();
        Post cologPost = createCologPost(writer, PostVisibility.PUBLIC);
        when(postRepository.findDetailById(POST_ID))
                .thenReturn(Optional.of(cologPost));
        when(blogMemberRepository.countActiveMembers(COLOG_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(3L);
        when(postRepository.countByCologIdAndStatusAndVisibilityAndDeletedAtIsNull(
                COLOG_ID,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC
        )).thenReturn(5L);

        // when
        PostDetailResponse response = postService.readPostOfBlogs(POST_ID, null);

        // then
        assertThat(response.owner())
                .isInstanceOfSatisfying(CologOwnerResponse.class, affiliation -> {
                    assertThat(affiliation.type()).isEqualTo(BlogType.COLOG);
                    assertThat(affiliation.memberCount()).isEqualTo(3L);
                    assertThat(affiliation.postCount()).isEqualTo(5L);
                });
        assertThat(response.viewerPermissions().canEdit()).isFalse();
        assertThat(response.viewerPermissions().canDelete()).isFalse();
    }

    @Test
    @DisplayName("팀 블로그 게시글 작성자가 현재 활성 멤버이면 수정과 삭제를 할 수 있다")
    void readCologPostAllowsActiveWriterToEditAndDelete() {
        // given
        User writer = createWriter();
        Post cologPost = createCologPost(writer, PostVisibility.PUBLIC);
        BlogMember requesterMember = createMember(cologPost.getColog(), writer, BlogPermission.MEMBER);
        when(postRepository.findDetailById(POST_ID))
                .thenReturn(Optional.of(cologPost));
        when(blogMemberRepository.countActiveMembers(COLOG_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(3L);
        when(postRepository.countByCologIdAndStatusAndVisibilityAndDeletedAtIsNull(
                COLOG_ID,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC
        )).thenReturn(5L);
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                WRITER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));

        // when
        PostDetailResponse response = postService.readPostOfBlogs(POST_ID, WRITER_ID);

        // then
        assertThat(response.viewerPermissions().canEdit()).isTrue();
        assertThat(response.viewerPermissions().canDelete()).isTrue();
    }

    @Test
    @DisplayName("팀 블로그 게시글 작성자가 현재 활성 멤버가 아니면 수정과 삭제를 할 수 없다")
    void readCologPostRejectsLeftWriterPermissions() {
        // given
        User writer = createWriter();
        Post cologPost = createCologPost(writer, PostVisibility.PUBLIC);
        when(postRepository.findDetailById(POST_ID))
                .thenReturn(Optional.of(cologPost));
        when(blogMemberRepository.countActiveMembers(COLOG_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(3L);
        when(postRepository.countByCologIdAndStatusAndVisibilityAndDeletedAtIsNull(
                COLOG_ID,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC
        )).thenReturn(5L);
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                WRITER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.empty());

        // when
        PostDetailResponse response = postService.readPostOfBlogs(POST_ID, WRITER_ID);

        // then
        assertThat(response.viewerPermissions().canEdit()).isFalse();
        assertThat(response.viewerPermissions().canDelete()).isFalse();
    }

    @Test
    @DisplayName("팀 블로그 OWNER와 ADMIN은 다른 작성자의 게시글을 삭제할 수 있다")
    void readCologPostAllowsManagerToDeleteAnotherWritersPost() {
        // given
        User writer = createWriter();
        User requester = createRequester();
        Post cologPost = createCologPost(writer, PostVisibility.PUBLIC);
        BlogMember requesterMember = createMember(cologPost.getColog(), requester, BlogPermission.ADMIN);
        when(postRepository.findDetailById(POST_ID))
                .thenReturn(Optional.of(cologPost));
        when(blogMemberRepository.countActiveMembers(COLOG_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(3L);
        when(postRepository.countByCologIdAndStatusAndVisibilityAndDeletedAtIsNull(
                COLOG_ID,
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC
        )).thenReturn(5L);
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID,
                REQUESTER_ID,
                BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(requesterMember));

        // when
        PostDetailResponse response = postService.readPostOfBlogs(POST_ID, REQUESTER_ID);

        // then
        assertThat(response.viewerPermissions().canEdit()).isFalse();
        assertThat(response.viewerPermissions().canDelete()).isTrue();
    }

    @Test
    @DisplayName("블로그의 비공개 게시글은 로그인하지 않으면 조회할 수 없다")
    void readPrivateBlogPostRejectsAnonymousUser() {
        // given
        User writer = createWriter();
        Post privatePost = createPost(writer, PostVisibility.PRIVATE);
        when(postRepository.findDetailById(POST_ID))
                .thenReturn(Optional.of(privatePost));

        // when - then
        assertThatThrownBy(() -> postService.readPostOfBlogs(POST_ID, null))
                .isInstanceOf(PostException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(PRIVATE_POST_READ_FORBIDDEN);
    }

    @Test
    @DisplayName("블로그의 비공개 게시글은 작성자가 조회할 수 있다")
    void readPrivateBlogPostAllowsWriter() {
        // given
        User writer = createWriter();
        Post privatePost = createPost(writer, PostVisibility.PRIVATE);
        when(postRepository.findDetailById(POST_ID))
                .thenReturn(Optional.of(privatePost));

        // when
        PostDetailResponse response = postService.readPostOfBlogs(POST_ID, WRITER_ID);

        // then
        assertThat(response.title()).isEqualTo("게시글 제목");
    }

    @Test
    @DisplayName("블로그의 비공개 게시글은 작성자가 아닌 사용자가 조회할 수 없다")
    void readPrivateBlogPostRejectsNonWriter() {
        // given
        User writer = createWriter();
        Post privatePost = createPost(writer, PostVisibility.PRIVATE);
        when(postRepository.findDetailById(POST_ID))
                .thenReturn(Optional.of(privatePost));

        // when - then
        assertThatThrownBy(() -> postService.readPostOfBlogs(POST_ID, 999L))
                .isInstanceOf(PostException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(PRIVATE_POST_READ_FORBIDDEN);
    }

    @Test
    @DisplayName("개인 블로그 게시글 작성자라도 활성 멤버가 아니면 삭제할 수 없다")
    void deleteRilogPostRejectsWriterWithoutActiveMember() {
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

        // when - then
        assertThatThrownBy(() -> postService.deletePublishedPost(POST_ID, WRITER_ID))
                .isInstanceOf(PostException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(POST_DELETE_FORBIDDEN);
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

    private PostSaveCommand createCommand(String slug) {
        return new PostSaveCommand(
                slug,
                "게시글 제목",
                content,
                Category.TECH,
                PostVisibility.PUBLIC,
                "https://example.com/thumbnail.png",
                null
        );
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
