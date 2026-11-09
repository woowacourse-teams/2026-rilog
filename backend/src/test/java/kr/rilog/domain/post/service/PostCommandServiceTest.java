package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.post.service.dto.result.PostUpdateResult;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import java.time.LocalDateTime;
import java.util.List;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.blog.entity.vo.Slug;
import org.springframework.context.ApplicationEventPublisher;
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
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostCommandServiceTest {

    private static final Long POST_ID = 1L;
    private static final Long WRITER_ID = 2L;
    private static final Long REQUESTER_ID = 9L;
    private static final Long RILOG_ID = 3L;
    private static final Long COLOG_ID = 4L;
    private static final String RILOG_SLUG = "writer_rilog";
    private static final String COLOG_SLUG = "team_colog";

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

    @Mock
    private CommentAnchorSelectionRepository commentAnchorSelectionRepository;

    @Mock
    private PostViewCountRepository viewCountRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private final JsonNode content = JsonNodeFactory.instance.arrayNode();

    private PostCommandService postCommandService;

    @BeforeEach
    void setUp() {
        postCommandService = new PostCommandService(
                postRepository,
                blogRepository,
                blogMemberRepository,
                userRepository,
                chapterRepository,
                tagAssetsPublisher,
                commentAnchorSelectionRepository,
                viewCountRepository,
                eventPublisher
        );
    }

    @Test
    @DisplayName("개인 블로그에 게시글을 발행하면 해당 개인 블로그에만 게시글을 발행한다.")
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
        PostPublishResult result = postCommandService.publish(command, WRITER_ID);

        // then
        ArgumentCaptor<Post> postCaptor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(postCaptor.capture());
        Post publishedPost = postCaptor.getValue();

        assertSoftly(softly -> {
            softly.assertThat(publishedPost.getUser()).isSameAs(writer);
            softly.assertThat(publishedPost.getRilog()).isSameAs(rilog);
            softly.assertThat(publishedPost.getColog()).isNull();
            softly.assertThat(result).isEqualTo(new PostPublishResult(POST_ID, RILOG_SLUG));
        });
    }

    @Test
    @DisplayName("팀 블로그에 게시글을 발행하면 팀 블로그와 작성자의 개인 블로그에 함께 게시글을 발행한다.")
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
        PostPublishResult result = postCommandService.publish(command, WRITER_ID);

        // then
        ArgumentCaptor<Post> postCaptor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(postCaptor.capture());
        Post publishedPost = postCaptor.getValue();

        assertSoftly(softly -> {
            softly.assertThat(publishedPost.getUser()).isSameAs(writer);
            softly.assertThat(publishedPost.getRilog()).isSameAs(rilog);
            softly.assertThat(publishedPost.getColog()).isSameAs(colog);
            softly.assertThat(result).isEqualTo(new PostPublishResult(POST_ID, COLOG_SLUG));
        });
    }

    @Test
    @DisplayName("팀 블로그의 활성 멤버가 아니면 팀 블로그에 게시글을 발행할 수 없다.")
    void publishToCologFailsWhenWriterIsNotActiveMember() {
        // given
        User writer = createWriter();
        Blog colog = createColog();
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(COLOG_SLUG))).thenReturn(Optional.of(colog));
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(blogMemberRepository.existsByBlogIdAndUserIdAndStatus(COLOG_ID, WRITER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(false);

        // when - then
        assertThatThrownBy(() -> postCommandService.publish(createCommand(COLOG_SLUG), WRITER_ID))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_POST_PUBLISH_FORBIDDEN.getMessage());
        verify(blogRepository, never()).findRilogByOwnerId(WRITER_ID);
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    @DisplayName("발행할 블로그가 존재하지 않으면 게시글 발행에 실패한다.")
    void publishFailsWhenPublishingBlogDoesNotExist() {
        // given
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(RILOG_SLUG))).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> postCommandService.publish(createCommand(RILOG_SLUG), WRITER_ID))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_NOT_FOUND.getMessage());
        verifyNoInteractions(postRepository);
    }

    @Test
    @DisplayName("작성자가 존재하지 않으면 게시글 발행에 실패한다.")
    void publishFailsWhenWriterDoesNotExist() {
        // given
        User rilogOwner = createWriter();
        Blog rilog = createRilog(rilogOwner);
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(RILOG_SLUG))).thenReturn(Optional.of(rilog));
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> postCommandService.publish(createCommand(RILOG_SLUG), WRITER_ID))
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());
        verifyNoInteractions(postRepository);
    }

    @Test
    @DisplayName("팀 블로그에 발행할 때 작성자의 개인 블로그가 없으면 게시글 발행에 실패한다.")
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
        assertThatThrownBy(() -> postCommandService.publish(createCommand(COLOG_SLUG), WRITER_ID))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_NOT_FOUND.getMessage());
        verifyNoInteractions(postRepository);
    }

    @Test
    @DisplayName("다른 사용자의 개인 블로그에는 게시글을 발행할 수 없다.")
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
        assertThatThrownBy(() -> postCommandService.publish(createCommand(RILOG_SLUG), WRITER_ID))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());
        verifyNoInteractions(postRepository, viewCountRepository, tagAssetsPublisher, eventPublisher);
    }

    @Test
    @DisplayName("개인 블로그 게시글 작성자라도 활성 멤버가 아니면 삭제할 수 없다.")
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
        assertThatThrownBy(() -> postCommandService.deletePublishedPost(POST_ID, WRITER_ID))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_DELETE_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("발행 블로그에서 챕터를 찾을 수 없으면 게시글을 저장하지 않는다.")
    void publishRejectsUnavailableChapterWithoutSaving() {
        // given
        User writer = createWriter();
        Blog rilog = createRilog(writer);
        Long chapterId = 10L;
        PostSaveCommand command = new PostSaveCommand(
                RILOG_SLUG, "게시글", content, Category.TECH, PostVisibility.PUBLIC, null, chapterId
        );
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(RILOG_SLUG))).thenReturn(Optional.of(rilog));
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(chapterRepository.findByIdAndBlogIdAndDeletedAtIsNull(chapterId, RILOG_ID))
                .thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> postCommandService.publish(command, WRITER_ID))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());
        verifyNoInteractions(postRepository, viewCountRepository, tagAssetsPublisher, eventPublisher);
    }

    @ParameterizedTest
    @CsvSource({"RILOG, RILOG", "RILOG, COLOG", "COLOG, RILOG"})
    @DisplayName("게시글을 수정하면 게시글 ID와 대상 블로그 slug를 반환한다.")
    void updateReturnsTargetAffiliation(BlogType sourceType, BlogType targetType) {
        // given
        User writer = createWriter();
        Post post = createPost(writer, PostVisibility.PUBLIC);
        Blog rilog = post.getRilog();
        Blog colog = createColog();
        LocalDateTime joinedAt = LocalDateTime.of(2026, 8, 1, 12, 0);
        if (sourceType == BlogType.COLOG) {
            post.update(PostFixture.updatedPostDetail(), colog);
        }
        Blog target = targetType == BlogType.COLOG ? colog : rilog;
        PostUpdateCommand command = PostFixture.updateCommandTo(target.getSlug());
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED)).thenReturn(Optional.of(post));
        when(blogMemberRepository.findWithBlogBySlugAndUserId(Slug.from(RILOG_SLUG), WRITER_ID))
                .thenReturn(Optional.of(BlogMember.createOwner(rilog, writer, joinedAt)));
        if (sourceType == BlogType.COLOG || targetType == BlogType.COLOG) {
            when(blogMemberRepository.findWithBlogBySlugAndUserId(Slug.from(COLOG_SLUG), WRITER_ID))
                    .thenReturn(Optional.of(BlogMember.createOwner(colog, writer, joinedAt)));
        }
        when(commentAnchorSelectionRepository.findAllActiveByPostId(POST_ID)).thenReturn(List.of());

        // when
        PostUpdateResult result = postCommandService.update(command, POST_ID, WRITER_ID);

        // then
        assertThat(result).isEqualTo(new PostUpdateResult(POST_ID, target.getSlug()));
        assertThat(post.getTitle()).isEqualTo(command.title());
    }

    @Test
    @DisplayName("발행 게시글이 조회되지 않으면 수정과 후속 작업을 수행하지 않는다.")
    void updateRejectsUnavailablePublishedPostWithoutSideEffects() {
        // given
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED)).thenReturn(Optional.empty());
        PostUpdateCommand command = PostFixture.updateCommandTo(RILOG_SLUG);

        // when & then
        assertThatThrownBy(() -> postCommandService.update(command, POST_ID, WRITER_ID))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
        verifyNoInteractions(blogMemberRepository, chapterRepository, commentAnchorSelectionRepository,
                tagAssetsPublisher, eventPublisher);
    }

    @Test
    @DisplayName("존재하지 않는 발행 게시글은 삭제 후속 작업을 수행하지 않는다.")
    void deleteRejectsUnavailablePublishedPostWithoutSideEffects() {
        // given
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED)).thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> postCommandService.deletePublishedPost(POST_ID, WRITER_ID))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
        verifyNoInteractions(blogMemberRepository, tagAssetsPublisher, eventPublisher);
    }

    @ParameterizedTest
    @EnumSource(value = BlogPermission.class, names = {"ADMIN", "MEMBER"})
    @DisplayName("Colog ADMIN은 타인 게시글을 삭제할 수 있고 MEMBER는 삭제할 수 없다.")
    void deleteAnotherWritersCologPostUsesActiveMemberPermission(BlogPermission permission) {
        // given
        User writer = createWriter();
        User requester = User.builder().id(REQUESTER_ID).githubId(200L).build();
        Blog colog = createColog();
        Post post = PostFixture.publicPublishedColog(createRilog(writer), colog, writer);
        BlogMember member = BlogMember.invite(colog, requester, "팀원", permission, LocalDateTime.of(2026, 8, 1, 12, 0));
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED)).thenReturn(Optional.of(post));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID, REQUESTER_ID, BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(member));

        // when & then
        if (permission == BlogPermission.ADMIN) {
            postCommandService.deletePublishedPost(POST_ID, REQUESTER_ID);
            assertThat(post.getDeletedAt()).isNotNull();
            verify(tagAssetsPublisher).detach(REQUESTER_ID, post.getTagAssets());
        } else {
            assertDeleteForbiddenAndUnchanged(post);
        }
    }

    @Test
    @DisplayName("현재 활성 멤버십이 없는 사용자는 Colog 게시글을 삭제할 수 없다.")
    void deleteCologPostRejectsFormerAdminOrOutsider() {
        // given
        User writer = createWriter();
        Post post = PostFixture.publicPublishedColog(createRilog(writer), createColog(), writer);
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED)).thenReturn(Optional.of(post));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID, REQUESTER_ID, BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.empty());

        // when & then
        assertDeleteForbiddenAndUnchanged(post);
        verify(blogMemberRepository).findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                COLOG_ID, REQUESTER_ID, BlogMemberStatus.ACTIVE
        );
    }

    @Test
    @DisplayName("개인 블로그 게시글의 작성자가 아닌 사용자는 글을 삭제할 수 없다.")
    void deleteRilogPostRejectsNonWriter() {
        // given
        Post post = createPost(createWriter(), PostVisibility.PUBLIC);
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED)).thenReturn(Optional.of(post));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                RILOG_ID, REQUESTER_ID, BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.empty());

        // when & then
        assertDeleteForbiddenAndUnchanged(post);
    }

    private void assertDeleteForbiddenAndUnchanged(Post post) {
        assertThatThrownBy(() -> postCommandService.deletePublishedPost(POST_ID, REQUESTER_ID))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_DELETE_FORBIDDEN.getMessage());
        assertThat(post.getDeletedAt()).isNull();
        verifyNoInteractions(tagAssetsPublisher, eventPublisher);
    }

    private User createWriter() {
        return User.builder()
                .id(WRITER_ID)
                .githubId(100L)
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
