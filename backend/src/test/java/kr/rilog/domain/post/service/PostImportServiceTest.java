package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.post.view.PostViewStore;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.node.JsonNodeFactory;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.COLOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.support.fixure.BlogFixture.createRilog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static kr.rilog.support.fixure.BlogFixture.targetColog;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostImportServiceTest {

    private static final Long TARGET_USER_ID = 7L;
    private static final Long POST_ID = 456L;
    private static final OffsetDateTime SOURCE_DATE = OffsetDateTime.parse("2024-03-15T14:30:00+09:00");
    private static final Instant ORIGINAL_PUBLISHED_AT = SOURCE_DATE.toInstant();
    private static final String IMAGE_URL = "https://example.com/imported-body.png";
    private static final String THUMBNAIL = "rilog/uploads/images/originals/7-thumbnail.png";

    @Mock private PostRepository postRepository;
    @Mock private BlogRepository blogRepository;
    @Mock private BlogMemberRepository blogMemberRepository;
    @Mock private UserRepository userRepository;
    @Mock private ChapterRepository chapterRepository;
    @Mock private TagAssetsPublisher tagAssetsPublisher;
    @Mock private CommentAnchorSelectionRepository selectionRepository;
    @Mock private PostViewCountRepository viewCountRepository;
    @Mock private PostViewStore postViewStore;

    private PostService postService;

    @BeforeEach
    void setUp() {
        postService = new PostService(
                postRepository, blogRepository, blogMemberRepository, userRepository,
                chapterRepository, tagAssetsPublisher, selectionRepository, viewCountRepository, postViewStore
        );
    }

    @ParameterizedTest
    @EnumSource(PostVisibility.class)
    @DisplayName("개인 블로그 이관은 원문 정보와 공개 범위를 보존하고 대상 작성자 명의로 챕터 없이 발행한다.")
    void importsToRilogPreservingSourceAndVisibility(PostVisibility visibility) {
        // given
        User writer = createUser(TARGET_USER_ID);
        Blog rilog = createRilog(writer);
        PostSaveCommand command = command(rilog.getSlug(), visibility, THUMBNAIL);
        stubDestination(rilog, writer);
        stubSave();

        // when
        PostPublishResult result = postService.publishImported(command, TARGET_USER_ID, ORIGINAL_PUBLISHED_AT);

        // then
        Post post = savedPost();
        assertImportedFields(post, command, writer);
        assertThat(post.getRilog()).isSameAs(rilog);
        assertThat(post.getColog()).isNull();
        assertThat(result).isEqualTo(new PostPublishResult(POST_ID, rilog.getSlug()));
        verify(viewCountRepository).initialize(POST_ID);
        verify(tagAssetsPublisher).attach(TagAssets.of(IMAGE_URL, THUMBNAIL));
        verifyNoInteractions(chapterRepository);
    }

    @Test
    @DisplayName("Colog 이관은 대상 작성자의 활성 멤버십으로 발행하고 null 썸네일을 유지한다.")
    void importsToCologWithNullThumbnail() {
        // given
        User writer = createUser(TARGET_USER_ID);
        Blog rilog = createRilog(writer);
        Blog colog = targetColog();
        PostSaveCommand command = command(colog.getSlug(), PostVisibility.PUBLIC, null);
        stubDestination(colog, writer);
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                colog.getId(), TARGET_USER_ID, BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.of(BlogMember.builder().blog(colog).user(writer).status(BlogMemberStatus.ACTIVE).build()));
        when(blogRepository.findRilogByOwnerId(TARGET_USER_ID)).thenReturn(Optional.of(rilog));
        stubSave();

        // when
        PostPublishResult result = postService.publishImported(command, TARGET_USER_ID, ORIGINAL_PUBLISHED_AT);

        // then
        Post post = savedPost();
        assertImportedFields(post, command, writer);
        assertThat(post.getRilog()).isSameAs(rilog);
        assertThat(post.getColog()).isSameAs(colog);
        assertThat(post.getThumbnailImageUrl()).isNull();
        assertThat(result).isEqualTo(new PostPublishResult(POST_ID, colog.getSlug()));
        verify(tagAssetsPublisher).attach(TagAssets.of(IMAGE_URL));
        verifyNoInteractions(chapterRepository);
    }

    @Test
    @DisplayName("대상 작성자 소유가 아닌 개인 블로그로 이관하면 저장하지 않는다.")
    void rejectsAnotherUsersRilog() {
        // given
        User writer = createUser(TARGET_USER_ID);
        Blog otherRilog = createRilog(createUser(99L));
        PostSaveCommand command = command(otherRilog.getSlug(), PostVisibility.PUBLIC, THUMBNAIL);
        stubDestination(otherRilog, writer);

        // when - then
        assertThatThrownBy(() -> postService.publishImported(command, TARGET_USER_ID, ORIGINAL_PUBLISHED_AT))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());

        verifyNoInteractions(postRepository, viewCountRepository, tagAssetsPublisher);
    }

    @Test
    @DisplayName("대상 작성자의 활성·미삭제 Colog 멤버십이 없으면 이관하지 않는다.")
    void rejectsCologWithoutActiveUndeletedTargetMembership() {
        // given
        User writer = createUser(TARGET_USER_ID);
        Blog colog = targetColog();
        PostSaveCommand command = command(colog.getSlug(), PostVisibility.PUBLIC, THUMBNAIL);
        stubDestination(colog, writer);
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                colog.getId(), TARGET_USER_ID, BlogMemberStatus.ACTIVE
        )).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> postService.publishImported(command, TARGET_USER_ID, ORIGINAL_PUBLISHED_AT))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_POST_PUBLISH_FORBIDDEN.getMessage());

        verifyNoInteractions(postRepository, viewCountRepository, tagAssetsPublisher);
    }

    private void stubDestination(Blog blog, User writer) {
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(blog.getSlug())))
                .thenReturn(Optional.of(blog));
        when(userRepository.findById(TARGET_USER_ID)).thenReturn(Optional.of(writer));
    }

    private void stubSave() {
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> {
            Post post = invocation.getArgument(0);
            ReflectionTestUtils.setField(post, "id", POST_ID);
            return post;
        });
    }

    private Post savedPost() {
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        return captor.getValue();
    }

    private void assertImportedFields(Post post, PostSaveCommand command, User writer) {
        assertSoftly(softly -> {
            softly.assertThat(post.getUser()).isSameAs(writer);
            softly.assertThat(post.getTitle()).isEqualTo(command.title());
            softly.assertThat(post.getContent().getContent()).isEqualTo(command.content());
            softly.assertThat(post.getCategory()).isEqualTo(command.category());
            softly.assertThat(post.getVisibility()).isEqualTo(command.visibility());
            softly.assertThat(post.getThumbnailImageUrl()).isEqualTo(command.thumbnailImageUrl());
            softly.assertThat(post.getPublishedAt())
                    .isEqualTo(SOURCE_DATE.atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime());
            softly.assertThat(post.getChapter()).isNull();
            softly.assertThat(post.getStatus()).isEqualTo(PostStatus.PUBLISHED);
        });
    }

    private PostSaveCommand command(String slug, PostVisibility visibility, String thumbnail) {
        var content = JsonNodeFactory.instance.arrayNode();
        content.addObject().put("type", "paragraph").putArray("content")
                .addObject().put("type", "text").put("text", "원문 문단");
        content.addObject().put("type", "image").putObject("props").put("url", IMAGE_URL);
        return new PostSaveCommand(slug, "원문 제목", content, Category.RETROSPECT, visibility, thumbnail, null);
    }
}
