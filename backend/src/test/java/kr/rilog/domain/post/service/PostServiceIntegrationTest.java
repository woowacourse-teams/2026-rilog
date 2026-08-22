package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.owner.CologOwnerResponse;
import kr.rilog.domain.post.controller.dto.response.owner.RilogOwnerResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.COLOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostServiceIntegrationTest extends ServiceSupport {

    private static final String RILOG_SLUG = "writer-rilog";
    private static final String COLOG_SLUG = "team-colog";

    @Autowired
    private PostService postService;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("개인 블로그에 게시글을 발행하면 발행 결과와 게시글을 저장한다.")
    void publishToRilogPersistsPublishedPost() {
        // given
        User writer = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("작성자", RILOG_SLUG)
        );
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        var command = PostFixture.commandWithTitleAndVisibility("개인 게시글", PostVisibility.PUBLIC);

        // when
        PostPublishResult result = postService.publish(command, RILOG_SLUG, writer.getId());

        // then
        Post savedPost = postRepository.findById(result.postId()).orElseThrow();

        assertThat(result.slug()).isEqualTo(RILOG_SLUG);
        assertThat(savedPost.getUser().getId()).isEqualTo(writer.getId());
        assertThat(savedPost.getRilog().getId()).isEqualTo(rilog.getId());
        assertThat(savedPost.getColog()).isNull();
        assertThat(savedPost.getTitle()).isEqualTo(command.title());
        assertThat(savedPost.getContent()).isEqualTo(command.content());
        assertThat(savedPost.getStatus()).isEqualTo(PostStatus.PUBLISHED);
    }

    @Test
    @DisplayName("팀 블로그에 게시글을 발행하면 팀 블로그와 작성자의 개인 블로그를 함께 저장한다.")
    void publishToCologPersistsCologAndWriterRilog() {
        // given
        User writer = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("팀 작성자", RILOG_SLUG)
        );
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        Blog colog = blogRepository.saveAndFlush(
                BlogFixture.createPersistableColog(writer, COLOG_SLUG)
        );
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(colog, writer));
        var command = PostFixture.commandWithTitleAndVisibility("팀 게시글", PostVisibility.PUBLIC);

        // when
        PostPublishResult result = postService.publish(command, COLOG_SLUG, writer.getId());

        // then
        Post savedPost = postRepository.findById(result.postId()).orElseThrow();

        assertThat(result.slug()).isEqualTo(COLOG_SLUG);
        assertThat(savedPost.getUser().getId()).isEqualTo(writer.getId());
        assertThat(savedPost.getRilog().getId()).isEqualTo(rilog.getId());
        assertThat(savedPost.getColog().getId()).isEqualTo(colog.getId());
        assertThat(savedPost.getStatus()).isEqualTo(PostStatus.PUBLISHED);
    }

    @Test
    @DisplayName("팀 블로그의 활성 멤버가 아니면 게시글을 발행하지 않는다.")
    void publishToCologRejectsInactiveMember() {
        // given
        User writer = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("작성자", RILOG_SLUG)
        );
        Blog colog = blogRepository.saveAndFlush(
                BlogFixture.createPersistableColog(writer, COLOG_SLUG)
        );

        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.commandWithTitleAndVisibility("팀 게시글", PostVisibility.PUBLIC),
                COLOG_SLUG,
                writer.getId()
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_POST_PUBLISH_FORBIDDEN.getMessage());
        assertThat(postRepository.findAll()).isEmpty();
        assertThat(blogMemberRepository.findByBlogIdAndUserIdAndStatus(
                colog.getId(),
                writer.getId(),
                BlogMemberStatus.ACTIVE
        )).isEmpty();
    }

    @Test
    @DisplayName("발행할 블로그가 없으면 게시글을 발행하지 않는다.")
    void publishRejectsWhenBlogDoesNotExist() {
        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.commandWithTitleAndVisibility("게시글", PostVisibility.PUBLIC),
                RILOG_SLUG,
                Long.MIN_VALUE
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_NOT_FOUND.getMessage());
        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("작성자가 없으면 게시글을 발행하지 않는다.")
    void publishRejectsWhenWriterDoesNotExist() {
        // given
        User owner = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("블로그 주인", RILOG_SLUG)
        );
        blogRepository.saveAndFlush(Blog.createRilog(owner));

        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.commandWithTitleAndVisibility("게시글", PostVisibility.PUBLIC),
                RILOG_SLUG,
                Long.MIN_VALUE
        ))
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());
        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("팀 블로그에 발행할 때 작성자의 개인 블로그가 없으면 게시글을 발행하지 않는다.")
    void publishToCologRejectsWhenWriterRilogDoesNotExist() {
        // given
        User writer = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("작성자", RILOG_SLUG)
        );
        Blog colog = blogRepository.saveAndFlush(
                BlogFixture.createPersistableColog(writer, COLOG_SLUG)
        );
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(colog, writer));

        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.commandWithTitleAndVisibility("팀 게시글", PostVisibility.PUBLIC),
                COLOG_SLUG,
                writer.getId()
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_NOT_FOUND.getMessage());
        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("다른 사용자의 개인 블로그에는 게시글을 발행하지 않는다.")
    void publishToRilogRejectsNonOwner() {
        // given
        User owner = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("블로그 주인", "blog-owner")
        );
        User writer = userRepository.saveAndFlush(
                createCompletedUser(300L, "작성자", RILOG_SLUG)
        );
        blogRepository.saveAndFlush(Blog.createRilog(owner));

        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.commandWithTitleAndVisibility("게시글", PostVisibility.PUBLIC),
                "blog-owner",
                writer.getId()
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());
        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("개인 블로그의 공개 게시글은 로그인하지 않아도 조회한다.")
    void readPublicRilogPostReturnsSavedPost() {
        // given
        User writer = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("작성자", RILOG_SLUG)
        );
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        Post post = postRepository.saveAndFlush(
                Post.create(
                        rilog,
                        writer,
                        PostFixture.detailWithTitleAndVisibility("공개 게시글", PostVisibility.PUBLIC)
                )
        );

        // when
        PostDetailResponse result = postService.readPostOfBlogs(RILOG_SLUG, post.getId(), null);

        // then
        assertThat(result.title()).isEqualTo(post.getTitle());
        assertThat(result.content()).isEqualTo(post.getContent());
        assertThat(result.author().userId()).isEqualTo(writer.getId());
        assertThat(result.owner())
                .isInstanceOfSatisfying(RilogOwnerResponse.class, owner -> {
                    assertThat(owner.type()).isEqualTo(BlogType.RILOG);
                    assertThat(owner.blogId()).isEqualTo(rilog.getId());
                    assertThat(owner.slug()).isEqualTo(RILOG_SLUG);
                });
    }

    @Test
    @DisplayName("개인 블로그의 비공개 게시글은 작성자만 조회한다.")
    void readPrivateRilogPostAllowsWriter() {
        // given
        User writer = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("작성자", RILOG_SLUG)
        );
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        Post post = postRepository.saveAndFlush(
                Post.create(
                        rilog,
                        writer,
                        PostFixture.detailWithTitleAndVisibility("비공개 게시글", PostVisibility.PRIVATE)
                )
        );

        // when
        PostDetailResponse result = postService.readPostOfBlogs(
                RILOG_SLUG,
                post.getId(),
                writer.getId()
        );

        // then
        assertThat(result.title()).isEqualTo("비공개 게시글");
    }

    @Test
    @DisplayName("개인 블로그의 비공개 게시글을 작성자가 아닌 사용자가 조회하면 예외가 발생한다.")
    void readPrivateRilogPostRejectsNonWriter() {
        // given
        User writer = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("작성자", RILOG_SLUG)
        );
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        Post post = postRepository.saveAndFlush(
                Post.create(
                        rilog,
                        writer,
                        PostFixture.detailWithTitleAndVisibility("비공개 게시글", PostVisibility.PRIVATE)
                )
        );

        // when & then
        assertThatThrownBy(() -> postService.readPostOfBlogs(RILOG_SLUG, post.getId(), 999L))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("존재하지 않는 게시글을 조회하면 예외가 발생한다.")
    void readPostRejectsWhenPostDoesNotExist() {
        // when & then
        assertThatThrownBy(() -> postService.readPostOfBlogs(RILOG_SLUG, Long.MIN_VALUE, null))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("팀 블로그 게시글을 조회하면 활성 멤버 수와 공개 게시글 수를 반환한다.")
    void readCologPostReturnsMemberAndPostCounts() {
        // given
        User writer = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("작성자", RILOG_SLUG)
        );
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        Blog colog = blogRepository.saveAndFlush(
                BlogFixture.createPersistableColog(writer, COLOG_SLUG)
        );
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(colog, writer));
        Post post = postRepository.saveAndFlush(
                Post.create(
                        colog,
                        rilog,
                        writer,
                        PostFixture.detailWithTitleAndVisibility("팀 게시글", PostVisibility.PUBLIC)
                )
        );

        // when
        PostDetailResponse result = postService.readPostOfBlogs(COLOG_SLUG, post.getId(), null);

        // then
        assertThat(result.owner())
                .isInstanceOfSatisfying(CologOwnerResponse.class, owner -> {
                    assertThat(owner.type()).isEqualTo(BlogType.COLOG);
                    assertThat(owner.blogId()).isEqualTo(colog.getId());
                    assertThat(owner.memberCount()).isEqualTo(1L);
                    assertThat(owner.postCount()).isEqualTo(1L);
                });
    }

    @Test
    @DisplayName("발행된 공개 게시글 수를 조회한다.")
    void readPostsCountReturnsPublishedPublicPostCount() {
        // given
        User writer = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("작성자", RILOG_SLUG)
        );
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(writer));
        postRepository.saveAllAndFlush(java.util.List.of(
                PostFixture.builderForRilog(rilog, writer)
                        .title("공개 게시글")
                        .status(PostStatus.PUBLISHED)
                        .visibility(PostVisibility.PUBLIC)
                        .build(),
                PostFixture.builderForRilog(rilog, writer)
                        .title("비공개 게시글")
                        .status(PostStatus.PUBLISHED)
                        .visibility(PostVisibility.PRIVATE)
                        .build(),
                PostFixture.builderForRilog(rilog, writer)
                        .title("임시 게시글")
                        .status(PostStatus.DRAFT)
                        .visibility(PostVisibility.PUBLIC)
                        .build()
        ));

        // when
        var result = postService.readPostsCount();

        // then
        assertThat(result.totalPostsCount()).isEqualTo(1L);
    }

    private User createCompletedUser(long githubId, String nickname, String slug) {
        User user = User.createPendingGithubUser(
                githubId,
                nickname.toLowerCase().replace(" ", "-"),
                "https://example.com/profile.png"
        );
        user.completeOnboarding(
                nickname,
                slug,
                "기록하는 개발자입니다.",
                "https://example.com/profile.png",
                "https://github.com/rilog",
                "rilog@example.com"
        );
        return user;
    }

}
