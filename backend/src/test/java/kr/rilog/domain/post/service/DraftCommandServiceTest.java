package kr.rilog.domain.post.service;

import kr.rilog.domain.post.service.dto.result.DraftIdResult;
import org.mockito.ArgumentCaptor;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.domain.post.service.dto.command.DraftOverwriteCommand;
import kr.rilog.domain.post.service.dto.command.DraftPublishCommand;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.DRAFT_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.NOT_POST_AUTHOR;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static kr.rilog.support.fixure.BlogFixture.createColog;
import static kr.rilog.support.fixure.BlogFixture.createRilog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static kr.rilog.support.fixure.PostContentFixture.IMAGE_URL_A;
import static kr.rilog.support.fixure.PostContentFixture.IMAGE_URL_B;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.imageBlock;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DraftCommandServiceTest {

    private static final Long DRAFT_ID = 1L;
    private static final Long WRITER_ID = 1L;
    private static final String THUMBNAIL_URL = "https://example.com/thumbnail.png";
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 27, 12, 0);

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
    private PostViewCountRepository viewCountRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private DraftCommandService draftCommandService;

    @BeforeEach
    void setUp() {
        draftCommandService = new DraftCommandService(
                postRepository,
                blogRepository,
                blogMemberRepository,
                userRepository,
                chapterRepository,
                tagAssetsPublisher,
                viewCountRepository,
                eventPublisher
        );
    }

    @Test
    @DisplayName("초안 내용과 작성자 소속을 저장하고 저장된 ID를 반환하며 이미지를 연결한다.")
    void saveDraftAttachesTagAssets() {
        // given
        User writer = createUser(WRITER_ID);
        Blog rilog = createRilog(writer);
        DraftSaveCommand command = new DraftSaveCommand("초안", content(imageBlock(IMAGE_URL_A)).getContent());
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(blogRepository.findRilogByOwnerId(WRITER_ID)).thenReturn(Optional.of(rilog));
        when(postRepository.save(any(Post.class))).thenReturn(draftWithImage(rilog, writer, IMAGE_URL_A));

        // when
        DraftIdResult result = draftCommandService.saveDraft(command, WRITER_ID);

        // then
        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(captor.capture());
        Post submitted = captor.getValue();
        assertThat(result.draftId()).isEqualTo(DRAFT_ID);
        assertThat(submitted.getTitle()).isEqualTo(command.title());
        assertThat(submitted.getContent()).isEqualTo(PostContent.from(command.content()));
        assertThat(submitted.getStatus()).isEqualTo(PostStatus.DRAFT);
        assertThat(submitted.getVisibility()).isEqualTo(PostVisibility.PRIVATE);
        assertThat(submitted.getCategory()).isNull();
        assertThat(submitted.getThumbnailImageUrl()).isNull();
        assertThat(submitted.getUser()).isSameAs(writer);
        assertThat(submitted.getRilog()).isSameAs(rilog);
        assertThat(submitted.getColog()).isNull();
        verify(tagAssetsPublisher).attach(TagAssets.of(IMAGE_URL_A));
    }

    @Test
    @DisplayName("작성자가 없으면 초안을 저장하지 않고 이미지 연결도 요청하지 않는다.")
    void saveDraftRejectsMissingWriterWithoutSavingOrAttachingTagAssets() {
        // given
        DraftSaveCommand command = new DraftSaveCommand("초안", content(imageBlock(IMAGE_URL_A)).getContent());
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> draftCommandService.saveDraft(command, WRITER_ID));

        // then
        assertThat(thrown)
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());
        verifyNoInteractions(postRepository, tagAssetsPublisher);
    }

    @Test
    @DisplayName("작성자의 개인 블로그가 없으면 초안을 저장하지 않는다.")
    void saveDraftRejectsMissingRilogWithoutSaving() {
        // given
        User writer = createUser(WRITER_ID);
        DraftSaveCommand command = new DraftSaveCommand("초안", content(imageBlock(IMAGE_URL_A)).getContent());
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(blogRepository.findRilogByOwnerId(WRITER_ID)).thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> draftCommandService.saveDraft(command, WRITER_ID));

        // then
        assertThat(thrown)
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_NOT_FOUND.getMessage());
        verifyNoInteractions(postRepository, tagAssetsPublisher);
    }

    @Test
    @DisplayName("초안을 덮어쓰면 이전 본문 이미지와 현재 본문 이미지의 동기화를 요청한다.")
    void overwriteDraftSynchronizesTagAssets() {
        // given
        Post draft = draftWithImage(IMAGE_URL_A);
        DraftOverwriteCommand command = new DraftOverwriteCommand(
                "덮어쓴 초안",
                content(imageBlock(IMAGE_URL_B)).getContent()
        );
        TagAssets previous = draft.getTagAssets();
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.of(draft));

        // when
        DraftIdResult result = draftCommandService.overwriteDraft(command, DRAFT_ID, WRITER_ID);

        // then
        assertThat(result).isEqualTo(new DraftIdResult(DRAFT_ID));
        verify(tagAssetsPublisher).synchronize(WRITER_ID, previous, TagAssets.of(IMAGE_URL_B));
    }

    @Test
    @DisplayName("존재하지 않는 초안을 덮어쓰면 초안을 찾을 수 없다는 예외가 발생한다.")
    void overwriteDraftRejectsMissingDraft() {
        // given
        DraftOverwriteCommand command = new DraftOverwriteCommand(
                "덮어쓴 초안",
                content(imageBlock(IMAGE_URL_B)).getContent()
        );
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> draftCommandService.overwriteDraft(command, DRAFT_ID, WRITER_ID));

        // then
        assertThat(thrown)
                .isInstanceOf(PostException.class)
                .hasMessage(DRAFT_NOT_FOUND.getMessage());
        verifyNoInteractions(tagAssetsPublisher);
    }

    @Test
    @DisplayName("작성자가 아니면 초안 이미지의 동기화를 요청하지 않는다.")
    void overwriteDraftDoesNotSynchronizeTagAssetsWhenRequesterIsNotWriter() {
        // given
        Post draft = draftWithImage(IMAGE_URL_A);
        DraftOverwriteCommand command = new DraftOverwriteCommand(
                "덮어쓴 초안",
                content(imageBlock(IMAGE_URL_B)).getContent()
        );
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.of(draft));

        // when & then
        assertThatThrownBy(() -> draftCommandService.overwriteDraft(command, DRAFT_ID, 99L))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());
        verify(tagAssetsPublisher, never()).synchronize(any(), any(), any());
        assertThat(draft.getTitle()).isEqualTo("초안");
        assertThat(draft.getContent()).isEqualTo(PostContent.from(content(imageBlock(IMAGE_URL_A)).getContent()));
        assertThat(draft.getPublishedAt()).isEqualTo(NOW);
    }

    @ParameterizedTest
    @EnumSource(BlogType.class)
    @DisplayName("초안을 발행하면 초안 ID와 대상 블로그 slug를 반환하고 이미지 동기화를 요청한다.")
    void publishDraftReturnsTargetAndSynchronizesTagAssets(BlogType targetType) {
        // given
        User writer = createUser(WRITER_ID);
        Blog rilog = createRilog(writer);
        Blog target = targetType == BlogType.COLOG ? createColog(writer) : rilog;
        Post draft = draftWithImage(rilog, writer, IMAGE_URL_A);
        DraftPublishCommand command = new DraftPublishCommand(
                target.getSlug(),
                "발행 글",
                content(imageBlock(IMAGE_URL_B)).getContent(),
                Category.TECH,
                PostVisibility.PUBLIC,
                THUMBNAIL_URL,
                null
        );
        BlogMember membership = BlogMember.createOwner(rilog, writer, NOW);
        TagAssets previous = draft.getTagAssets();
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.of(draft));
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(blogMemberRepository.findWithBlogBySlugAndUserId(Slug.from(rilog.getSlug()), WRITER_ID))
                .thenReturn(Optional.of(membership));
        if (target.isColog()) {
            when(blogMemberRepository.findWithBlogBySlugAndUserId(Slug.from(target.getSlug()), WRITER_ID))
                    .thenReturn(Optional.of(BlogMember.createOwner(target, writer, NOW)));
        }

        // when
        PostPublishResult result = draftCommandService.publishDraft(command, DRAFT_ID, WRITER_ID);

        // then
        assertThat(result).isEqualTo(new PostPublishResult(DRAFT_ID, target.getSlug()));
        verify(tagAssetsPublisher).synchronize(
                WRITER_ID,
                previous,
                new TagAssets(Set.of(IMAGE_URL_B, THUMBNAIL_URL))
        );
    }

    @Test
    @DisplayName("작성자가 아니면 초안 발행 이미지의 동기화를 요청하지 않는다.")
    void publishDraftDoesNotSynchronizeTagAssetsWhenRequesterIsNotWriter() {
        // given
        Post draft = draftWithImage(IMAGE_URL_A);
        DraftPublishCommand command = new DraftPublishCommand(
                draft.getRilog().getSlug(),
                "발행 글",
                content(imageBlock(IMAGE_URL_B)).getContent(),
                Category.TECH,
                PostVisibility.PUBLIC,
                THUMBNAIL_URL,
                null
        );
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.of(draft));

        // when & then
        assertThatThrownBy(() -> draftCommandService.publishDraft(command, DRAFT_ID, 99L))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());
        verify(tagAssetsPublisher, never()).synchronize(any(), any(), any());
        assertThat(draft.getStatus()).isEqualTo(PostStatus.DRAFT);
        assertThat(draft.getTitle()).isEqualTo("초안");
        verifyNoInteractions(userRepository, blogMemberRepository, viewCountRepository, eventPublisher);
    }

    @Test
    @DisplayName("초안을 삭제하면 본문 이미지의 분리를 요청한다.")
    void deleteDraftDetachesTagAssets() {
        // given
        Post draft = draftWithImage(IMAGE_URL_A);
        TagAssets assets = draft.getTagAssets();
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.of(draft));

        // when
        draftCommandService.deleteDraft(DRAFT_ID, WRITER_ID);

        // then
        verify(tagAssetsPublisher).detach(WRITER_ID, assets);
    }

    @Test
    @DisplayName("작성자가 아니면 초안 이미지의 분리를 요청하지 않는다.")
    void deleteDraftDoesNotDetachTagAssetsWhenRequesterIsNotWriter() {
        // given
        Post draft = draftWithImage(IMAGE_URL_A);
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.of(draft));

        // when & then
        assertThatThrownBy(() -> draftCommandService.deleteDraft(DRAFT_ID, 99L))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());
        verify(tagAssetsPublisher, never()).detach(any(), any());
        assertThat(draft.getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("존재하지 않는 초안을 삭제하면 초안을 찾을 수 없다는 예외가 발생한다.")
    void deleteDraftRejectsMissingDraft() {
        // given
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> draftCommandService.deleteDraft(DRAFT_ID, WRITER_ID));

        // then
        assertThat(thrown)
                .isInstanceOf(PostException.class)
                .hasMessage(DRAFT_NOT_FOUND.getMessage());
        verifyNoInteractions(tagAssetsPublisher);
    }

    private Post draftWithImage(String imageUrl) {
        User writer = createUser(WRITER_ID);
        return draftWithImage(createRilog(writer), writer, imageUrl);
    }

    private Post draftWithImage(Blog rilog, User writer, String imageUrl) {
        return Post.builder()
                .id(DRAFT_ID)
                .user(writer)
                .rilog(rilog)
                .title("초안")
                .content(PostContent.from(content(imageBlock(imageUrl)).getContent()))
                .status(PostStatus.DRAFT)
                .visibility(PostVisibility.PRIVATE)
                .publishedAt(NOW)
                .build();
    }

}
