package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.vo.Slug;
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
import kr.rilog.domain.post.service.dto.command.DraftOverwriteCommand;
import kr.rilog.domain.post.service.dto.command.DraftPublishCommand;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static kr.rilog.domain.post.exception.PostErrorInformation.NOT_POST_AUTHOR;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static kr.rilog.support.fixure.BlogFixture.createRilog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static kr.rilog.support.fixure.PostContentFixture.IMAGE_URL_A;
import static kr.rilog.support.fixure.PostContentFixture.IMAGE_URL_B;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.imageBlock;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DraftServiceTest {

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

    private DraftService draftService;

    @BeforeEach
    void setUp() {
        draftService = new DraftService(
                postRepository,
                blogRepository,
                blogMemberRepository,
                userRepository,
                chapterRepository,
                tagAssetsPublisher
        );
    }

    @Test
    @DisplayName("초안을 저장하면 본문 이미지의 연결을 요청한다.")
    void saveDraftAttachesTagAssets() {
        // given
        User writer = createUser(WRITER_ID);
        Blog rilog = createRilog(writer);
        DraftSaveCommand command = new DraftSaveCommand("초안", content(imageBlock(IMAGE_URL_A)).getContent());
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(blogRepository.findRilogByOwnerId(WRITER_ID)).thenReturn(Optional.of(rilog));
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        draftService.saveDraft(command, WRITER_ID);

        // then
        verify(tagAssetsPublisher).attach(TagAssets.of(IMAGE_URL_A));
    }

    @Test
    @DisplayName("작성자가 없으면 초안 이미지의 연결을 요청하지 않는다.")
    void saveDraftDoesNotAttachTagAssetsWhenWriterDoesNotExist() {
        // given
        DraftSaveCommand command = new DraftSaveCommand("초안", content(imageBlock(IMAGE_URL_A)).getContent());
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> draftService.saveDraft(command, WRITER_ID))
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());
        verify(tagAssetsPublisher, never()).attach(any());
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
        draftService.overwriteDraft(command, DRAFT_ID, WRITER_ID);

        // then
        verify(tagAssetsPublisher).synchronize(previous, TagAssets.of(IMAGE_URL_B));
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
        assertThatThrownBy(() -> draftService.overwriteDraft(command, DRAFT_ID, 99L))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());
        verify(tagAssetsPublisher, never()).synchronize(any(), any());
    }

    @Test
    @DisplayName("초안을 발행하면 이전 본문 이미지와 발행 이미지의 동기화를 요청한다.")
    void publishDraftSynchronizesTagAssets() {
        // given
        User writer = createUser(WRITER_ID);
        Blog rilog = createRilog(writer);
        Post draft = draftWithImage(rilog, writer, IMAGE_URL_A);
        DraftPublishCommand command = new DraftPublishCommand(
                rilog.getSlug(),
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

        // when
        draftService.publishDraft(command, DRAFT_ID, WRITER_ID);

        // then
        verify(tagAssetsPublisher).synchronize(
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
        assertThatThrownBy(() -> draftService.publishDraft(command, DRAFT_ID, 99L))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());
        verify(tagAssetsPublisher, never()).synchronize(any(), any());
    }

    @Test
    @DisplayName("초안을 삭제하면 본문 이미지의 분리를 요청한다.")
    void deleteDraftDetachesTagAssets() {
        // given
        Post draft = draftWithImage(IMAGE_URL_A);
        TagAssets assets = draft.getTagAssets();
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.of(draft));

        // when
        draftService.deleteDraft(DRAFT_ID, WRITER_ID);

        // then
        verify(tagAssetsPublisher).detach(assets);
    }

    @Test
    @DisplayName("작성자가 아니면 초안 이미지의 분리를 요청하지 않는다.")
    void deleteDraftDoesNotDetachTagAssetsWhenRequesterIsNotWriter() {
        // given
        Post draft = draftWithImage(IMAGE_URL_A);
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.of(draft));

        // when & then
        assertThatThrownBy(() -> draftService.deleteDraft(DRAFT_ID, 99L))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());
        verify(tagAssetsPublisher, never()).detach(any());
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
