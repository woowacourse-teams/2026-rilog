package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.TotalPostsCountResponse;
import kr.rilog.domain.post.controller.dto.response.owner.CologOwnerResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
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

import java.time.LocalDateTime;

import static kr.rilog.domain.blog.entity.enums.BlogPermission.MEMBER;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.COLOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class PostServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime PUBLISHED_AT = LocalDateTime.of(2026, 8, 23, 12, 0);

    @Autowired
    private PostService postService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private PostRepository postRepository;

    @Test
    @DisplayName("개인 블로그에 게시글을 발행하면 명령의 내용과 개인 블로그 소속이 저장된다.")
    void publishToRilogPersistsPostDetailAndRilogAffiliation() {
        // given
        User writer = saveCompletedUser(1L, "개인작성자", "rilog-writer");
        Blog rilog = saveRilog(writer);
        PostSaveCommand command = PostFixture.publicPostPublishCommand();

        // when
        PostPublishResult result = postService.publish(command, rilog.getSlug(), writer.getId());

        // then
        Post savedPost = postRepository.findDetailById(result.postId())
                .orElseThrow();

        assertSoftly(softly -> {
            softly.assertThat(result).isEqualTo(new PostPublishResult(savedPost.getId(), rilog.getSlug()));
            softly.assertThat(savedPost.getTitle()).isEqualTo(command.title());
            softly.assertThat(savedPost.getContent()).isEqualTo(command.content());
            softly.assertThat(savedPost.getCategory()).isEqualTo(command.category());
            softly.assertThat(savedPost.getVisibility()).isEqualTo(command.visibility());
            softly.assertThat(savedPost.getThumbnailImageUrl()).isEqualTo(command.thumbnailImageUrl());
            softly.assertThat(savedPost.getStatus()).isEqualTo(PUBLISHED);
            softly.assertThat(savedPost.getPublishedAt()).isNotNull();
            softly.assertThat(savedPost.getUser().getId()).isEqualTo(writer.getId());
            softly.assertThat(savedPost.getRilog().getId()).isEqualTo(rilog.getId());
            softly.assertThat(savedPost.getColog()).isNull();
        });
    }

    @Test
    @DisplayName("팀 블로그의 활성 멤버가 게시글을 발행하면 팀 블로그와 작성자의 개인 블로그 소속이 함께 저장된다.")
    void publishToCologPersistsCologAndWriterRilogAffiliations() {
        // given
        User writer = saveCompletedUser(2L, "팀작성자", "colog-writer");
        Blog rilog = saveRilog(writer);
        Blog colog = saveColog(writer, "team-colog");
        saveOwnerMembership(colog, writer);
        PostSaveCommand command = PostFixture.publicPostPublishCommand();

        // when
        PostPublishResult result = postService.publish(command, colog.getSlug(), writer.getId());

        // then
        Post savedPost = postRepository.findDetailById(result.postId())
                .orElseThrow();

        assertSoftly(softly -> {
            softly.assertThat(result).isEqualTo(new PostPublishResult(savedPost.getId(), colog.getSlug()));
            softly.assertThat(savedPost.getUser().getId()).isEqualTo(writer.getId());
            softly.assertThat(savedPost.getRilog().getId()).isEqualTo(rilog.getId());
            softly.assertThat(savedPost.getColog().getId()).isEqualTo(colog.getId());
        });
    }

    @Test
    @DisplayName("팀 블로그의 활성 멤버가 아니면 게시글이 저장되지 않는다.")
    void publishToCologThrowsAndDoesNotPersistPostWhenWriterIsNotActiveMember() {
        // given
        User owner = saveCompletedUser(3L, "팀소유자", "team-owner");
        Blog colog = saveColog(owner, "owner-colog");
        saveOwnerMembership(colog, owner);
        User writer = saveCompletedUser(4L, "비멤버", "non-member");
        saveRilog(writer);

        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.publicPostPublishCommand(),
                colog.getSlug(),
                writer.getId()
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_POST_PUBLISH_FORBIDDEN.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("다른 사용자의 개인 블로그에 게시글을 발행하면 게시글이 저장되지 않는다.")
    void publishToRilogThrowsAndDoesNotPersistPostWhenWriterIsNotOwner() {
        // given
        User owner = saveCompletedUser(5L, "블로그소유자", "blog-owner");
        Blog ownerRilog = saveRilog(owner);
        User writer = saveCompletedUser(6L, "다른작성자", "other-writer");

        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.publicPostPublishCommand(),
                ownerRilog.getSlug(),
                writer.getId()
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_POST_PUBLISH_FORBIDDEN.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("팀 블로그 활성 멤버에게 개인 블로그가 없으면 게시글이 저장되지 않는다.")
    void publishToCologThrowsAndDoesNotPersistPostWhenWriterRilogDoesNotExist() {
        // given
        User owner = saveCompletedUser(7L, "팀블로그주인", "colog-owner");
        Blog colog = saveColog(owner, "missing-rilog-colog");
        saveOwnerMembership(colog, owner);
        User writer = saveCompletedUser(8L, "개인블로그없음", "writer-without-rilog");
        saveActiveMember(colog, writer);

        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.publicPostPublishCommand(),
                colog.getSlug(),
                writer.getId()
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_NOT_FOUND.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 블로그에 게시글을 발행하면 게시글이 저장되지 않는다.")
    void publishThrowsAndDoesNotPersistPostWhenBlogDoesNotExist() {
        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.publicPostPublishCommand(),
                "missing-blog",
                999L
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_NOT_FOUND.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("삭제된 블로그에 게시글을 발행하면 게시글이 저장되지 않는다.")
    void publishThrowsAndDoesNotPersistPostWhenBlogIsDeleted() {
        // given
        User owner = saveCompletedUser(9L, "삭제블로그주인", "deleted-blog-owner");
        Blog deletedRilog = saveRilog(owner);
        deletedRilog.delete();
        blogRepository.saveAndFlush(deletedRilog);

        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.publicPostPublishCommand(),
                deletedRilog.getSlug(),
                owner.getId()
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_NOT_FOUND.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 사용자가 게시글을 발행하면 게시글이 저장되지 않는다.")
    void publishThrowsAndDoesNotPersistPostWhenWriterDoesNotExist() {
        // given
        User owner = saveCompletedUser(10L, "사용자없음주인", "missing-user-owner");
        Blog rilog = saveRilog(owner);

        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.publicPostPublishCommand(),
                rilog.getSlug(),
                Long.MAX_VALUE
        ))
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("개인 블로그의 공개 게시글을 조회하면 게시글과 작성자 및 개인 블로그 정보를 반환한다.")
    void readPublicRilogPostReturnsPostAuthorAndRilog() {
        // given
        User writer = saveCompletedUser(11L, "공개글작성자", "public-post-writer");
        Blog rilog = saveRilog(writer);
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));
        PostDetailResponse expected = PostFixture.postDetailResponse(post, writer, rilog);

        // when
        PostDetailResponse result = postService.readPostOfBlogs(post.getId(), null);

        // then
        assertThat(result)
                .usingRecursiveComparison()
                .ignoringFields("publishedAt")
                .isEqualTo(expected);
    }

    @Test
    @DisplayName("개인 블로그의 비공개 게시글은 작성자가 조회할 수 있다.")
    void readPrivateRilogPostReturnsPostWhenRequesterIsWriter() {
        // given
        User writer = saveCompletedUser(12L, "비공개작성자", "private-post-writer");
        Blog rilog = saveRilog(writer);
        Post privatePost = savePost(PostFixture.privatePublishedRilogPost(rilog, writer));

        // when
        PostDetailResponse result = postService.readPostOfBlogs(privatePost.getId(), writer.getId());

        // then
        assertThat(result.title()).isEqualTo(privatePost.getTitle());
    }

    @Test
    @DisplayName("개인 블로그의 비공개 게시글을 비로그인 사용자가 조회하면 예외가 발생한다.")
    void readPrivateRilogPostThrowsWhenRequesterIsAnonymous() {
        // given
        User writer = saveCompletedUser(13L, "익명차단작성자", "anon-block-writer");
        Blog rilog = saveRilog(writer);
        Post privatePost = savePost(PostFixture.privatePublishedRilogPost(rilog, writer));

        // when & then
        assertThatThrownBy(() -> postService.readPostOfBlogs(privatePost.getId(), null))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("개인 블로그의 비공개 게시글을 다른 사용자가 조회하면 예외가 발생한다.")
    void readPrivateRilogPostThrowsWhenRequesterIsNotWriter() {
        // given
        User writer = saveCompletedUser(14L, "비공개글주인", "private-owner");
        Blog rilog = saveRilog(writer);
        Post privatePost = savePost(PostFixture.privatePublishedRilogPost(rilog, writer));
        User otherUser = saveCompletedUser(15L, "비공개타인", "private-outsider");

        // when & then
        assertThatThrownBy(() -> postService.readPostOfBlogs(privatePost.getId(), otherUser.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @Test
    @DisplayName("존재하지 않는 게시글 ID로 조회하면 예외가 발생한다.")
    void readPostThrowsWhenPostDoesNotExist() {
        // given
        User writer = saveCompletedUser(16L, "슬러그작성자", "post-slug-writer");
        Blog rilog = saveRilog(writer);
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));

        // when & then
        assertThatThrownBy(() -> postService.readPostOfBlogs(post.getId() + 1, null))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("삭제된 게시글을 조회하면 예외가 발생한다.")
    void readPostThrowsWhenPostIsDeleted() {
        // given
        User writer = saveCompletedUser(17L, "삭제글작성자", "deleted-post-writer");
        Blog rilog = saveRilog(writer);
        Post deletedPost = savePost(PostFixture.deletedPublicPublishedRilogPost(rilog, writer));

        // when & then
        assertThatThrownBy(() -> postService.readPostOfBlogs(deletedPost.getId(), null))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("팀 블로그 게시글을 조회하면 삭제되지 않은 멤버만 집계한다.")
    void readCologPostCountsOnlyNonDeletedMembers() {
        // given
        User owner = saveCompletedUser(18L, "집계팀주인", "count-colog-owner");
        Blog rilog = saveRilog(owner);
        Blog colog = saveColog(owner, "count-colog");
        User member = saveCompletedUser(19L, "집계팀멤버", "count-colog-member");
        User deletedMember = saveCompletedUser(20L, "삭제팀멤버", "deleted-colog-member");

        // 집계 대상
        saveOwnerMembership(colog, owner);
        saveActiveMember(colog, member);

        // 집계 제외
        saveDeletedActiveMember(colog, deletedMember);
        Post readTarget = savePost(PostFixture.publicPublishedColog(rilog, colog, owner));

        // when
        PostDetailResponse result = postService.readPostOfBlogs(readTarget.getId(), null);

        // then
        assertThat(result.owner()).isInstanceOfSatisfying(
                CologOwnerResponse.class,
                ownerResponse -> assertThat(ownerResponse.memberCount()).isEqualTo(2L)
        );
    }

    @Test
    @DisplayName("팀 블로그 게시글을 조회하면 공개 발행 게시글만 집계한다.")
    void readCologPostCountsOnlyPublicPublishedPosts() {
        // given
        User owner = saveCompletedUser(21L, "게시글집계팀주인", "post-count-owner");
        Blog rilog = saveRilog(owner);
        Blog colog = saveColog(owner, "post-count-colog");
        saveOwnerMembership(colog, owner);

        // 집계 대상
        Post readTarget = savePost(PostFixture.publicPublishedColog(rilog, colog, owner));
        savePost(PostFixture.publicPublishedColog(rilog, colog, owner));

        // 집계 제외
        savePost(PostFixture.privatePublishedCologPost(rilog, colog, owner));
        savePost(PostFixture.publicDraftCologPost(rilog, colog, owner));
        savePost(PostFixture.deletedPublicPublishedCologPost(rilog, colog, owner));

        // when
        PostDetailResponse result = postService.readPostOfBlogs(readTarget.getId(), null);

        // then
        assertThat(result.owner()).isInstanceOfSatisfying(
                CologOwnerResponse.class,
                ownerResponse -> assertThat(ownerResponse.postCount()).isEqualTo(2L)
        );
    }

    @Test
    @DisplayName("전체 게시글 수를 조회하면 공개 발행 게시글만 집계한다.")
    void readPostsCountCountsOnlyPublicPublishedPosts() {
        // given
        User writer = saveCompletedUser(22L, "전체집계작성자", "total-count-writer");
        Blog rilog = saveRilog(writer);

        // 집계 대상
        savePost(PostFixture.publicPublishedRilogPost(rilog, writer));
        savePost(PostFixture.publicPublishedRilogPost(rilog, writer));

        // 집계 제외
        savePost(PostFixture.privatePublishedRilogPost(rilog, writer));
        savePost(PostFixture.publicDraftRilogPost(rilog, writer));

        // when
        TotalPostsCountResponse result = postService.readPostsCount();

        // then
        assertThat(result.totalPostsCount()).isEqualTo(2L);
    }

    private User saveCompletedUser(long githubId, String nickname, String slug) {
        User user = UserFixture.user(githubId, "github-user-" + githubId);
        user.completeOnboarding(
                nickname,
                slug,
                "기록하는 개발자입니다.",
                "https://example.com/users/" + githubId + ".png",
                "https://github.com/github-user-" + githubId,
                "user" + githubId + "@example.com"
        );
        return userRepository.saveAndFlush(user);
    }

    private Blog saveRilog(User owner) {
        return blogRepository.saveAndFlush(Blog.createRilog(owner));
    }

    private Blog saveColog(User owner, String slug) {
        return blogRepository.saveAndFlush(Blog.createColog(owner, slug, BlogFixture.cologProfile()));
    }

    private BlogMember saveOwnerMembership(Blog blog, User owner) {
        return blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(blog, owner));
    }

    private BlogMember saveActiveMember(Blog blog, User user) {
        return blogMemberRepository.saveAndFlush(BlogMember.invite(
                blog,
                user,
                "개발자",
                MEMBER,
                PUBLISHED_AT
        ));
    }

    private BlogMember saveDeletedActiveMember(Blog blog, User user) {
        BlogMember member = saveActiveMember(blog, user);
        member.delete();
        return blogMemberRepository.saveAndFlush(member);
    }

    private Post savePost(Post post) {
        return postRepository.saveAndFlush(post);
    }

}
