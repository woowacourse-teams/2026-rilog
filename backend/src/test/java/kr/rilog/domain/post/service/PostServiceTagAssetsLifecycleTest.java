package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.service.TagAssetsLifecycle;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_DELETE_FORBIDDEN;
import static kr.rilog.domain.post.exception.PostErrorInformation.NOT_POST_AUTHOR;
import static kr.rilog.support.fixure.BlogFixture.createRilog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static kr.rilog.support.fixure.PostFixture.publicPostPublishCommand;
import static kr.rilog.support.fixure.PostFixture.publicPublishedRilogPost;
import static kr.rilog.support.fixure.PostFixture.updateCommandTo;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostServiceTagAssetsLifecycleTest {

    private static final Long POST_ID = 1L;
    private static final Long WRITER_ID = 1L;
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
    private TagAssetsLifecycle tagAssetsLifecycle;

    private PostService postService;

    @BeforeEach
    void setUp() {
        postService = new PostService(
                postRepository,
                blogRepository,
                blogMemberRepository,
                userRepository,
                chapterRepository,
                tagAssetsLifecycle
        );
    }

    @Test
    @DisplayName("게시글을 발행하면 게시글 이미지의 연결을 요청한다.")
    void publishAttachesTagAssets() {
        // given
        User writer = createUser(WRITER_ID);
        Blog rilog = createRilog(writer);
        PostSaveCommand command = publicPostPublishCommand(rilog.getSlug());
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(rilog.getSlug())))
                .thenReturn(Optional.of(rilog));
        when(userRepository.findById(WRITER_ID)).thenReturn(Optional.of(writer));
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        postService.publish(command, WRITER_ID);

        // then
        verify(tagAssetsLifecycle).attach(TagAssets.of(command.thumbnailImageUrl()));
    }

    @Test
    @DisplayName("발행할 블로그가 없으면 게시글 이미지의 연결을 요청하지 않는다.")
    void publishDoesNotAttachTagAssetsWhenBlogDoesNotExist() {
        // given
        PostSaveCommand command = publicPostPublishCommand("missing-blog");
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(command.slug())))
                .thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> postService.publish(command, WRITER_ID))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_NOT_FOUND.getMessage());
        verify(tagAssetsLifecycle, never()).attach(any());
    }

    @Test
    @DisplayName("게시글을 수정하면 이전 이미지와 현재 이미지의 동기화를 요청한다.")
    void updateSynchronizesTagAssets() {
        // given
        User writer = createUser(WRITER_ID);
        Blog rilog = createRilog(writer);
        Post post = publicPublishedRilogPost(rilog, writer);
        PostUpdateCommand command = updateCommandTo(rilog.getSlug());
        BlogMember membership = BlogMember.createOwner(rilog, writer, NOW);
        TagAssets previous = post.getTagAssets();
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(post));
        when(blogMemberRepository.findWithBlogBySlugAndUserId(Slug.from(rilog.getSlug()), WRITER_ID))
                .thenReturn(Optional.of(membership));

        // when
        postService.update(command, POST_ID, WRITER_ID);

        // then
        verify(tagAssetsLifecycle).synchronize(previous, post.getTagAssets());
    }

    @Test
    @DisplayName("작성자가 아니면 게시글 이미지의 동기화를 요청하지 않는다.")
    void updateDoesNotSynchronizeTagAssetsWhenRequesterIsNotWriter() {
        // given
        User writer = createUser(WRITER_ID);
        Blog rilog = createRilog(writer);
        Post post = publicPublishedRilogPost(rilog, writer);
        PostUpdateCommand command = updateCommandTo(rilog.getSlug());
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(post));

        // when & then
        assertThatThrownBy(() -> postService.update(command, POST_ID, 99L))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());
        verify(tagAssetsLifecycle, never()).synchronize(any(), any());
    }

    @Test
    @DisplayName("작성자가 아니면 발행 게시글 이미지의 분리를 요청하지 않는다.")
    void deleteDoesNotDetachTagAssetsWhenRequesterIsNotWriter() {
        // given
        User writer = createUser(WRITER_ID);
        Post post = publicPublishedRilogPost(createRilog(writer), writer);
        when(postRepository.findDetailByIdAndStatus(POST_ID, PostStatus.PUBLISHED))
                .thenReturn(Optional.of(post));

        // when & then
        assertThatThrownBy(() -> postService.deletePublishedPost(POST_ID, 99L))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_DELETE_FORBIDDEN.getMessage());
        verify(tagAssetsLifecycle, never()).detach(any());
    }

}
