package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.TotalPostsCountResponse;
import kr.rilog.domain.post.controller.dto.response.owner.CologOwnerResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.post.service.dto.result.PostUpdateResult;
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

import static kr.rilog.domain.blog.entity.enums.BlogPermission.ADMIN;
import static kr.rilog.domain.blog.entity.enums.BlogPermission.MEMBER;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.ALREADY_BLOG_MEMBER_LEFT;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.COLOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.exception.PostErrorInformation.NOT_POST_AUTHOR;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_DELETE_FORBIDDEN;
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
        PostSaveCommand command = PostFixture.publicPostPublishCommand(rilog.getSlug());

        // when
        PostPublishResult result = postService.publish(command, writer.getId());

        // then
        Post savedPost = postRepository.findDetailById(result.postId())
                .orElseThrow();

        assertSoftly(softly -> {
            softly.assertThat(result).isEqualTo(new PostPublishResult(savedPost.getId(), rilog.getSlug()));
            softly.assertThat(savedPost.getTitle()).isEqualTo(command.title());
            softly.assertThat(savedPost.getContent()).isEqualTo(PostContent.from(command.content()));
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
        PostSaveCommand command = PostFixture.publicPostPublishCommand(colog.getSlug());

        // when
        PostPublishResult result = postService.publish(command, writer.getId());

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
        User writer = saveCompletedUser(4L, "비멤버", "non-member");
        saveRilog(writer);

        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.publicPostPublishCommand(colog.getSlug()),
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
                PostFixture.publicPostPublishCommand(ownerRilog.getSlug()),
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
        User writer = saveCompletedUser(8L, "개인블로그없음", "writer-without-rilog");
        saveActiveMember(colog, writer);

        // when & then
        assertThatThrownBy(() -> postService.publish(
                PostFixture.publicPostPublishCommand(colog.getSlug()),
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
                PostFixture.publicPostPublishCommand("missing-blog"),
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
                PostFixture.publicPostPublishCommand(deletedRilog.getSlug()),
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
                PostFixture.publicPostPublishCommand(rilog.getSlug()),
                Long.MAX_VALUE
        ))
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("같은 개인 블로그에서 게시글을 수정하면 상세 정보가 저장되고 현재 소속을 반환한다.")
    void updateInSameRilogPersistsDetailAndReturnsCurrentAffiliation() {
        // given
        User writer = saveCompletedUser(23L, "수정작성자", "chg-auth-writer");
        Blog rilog = saveRilog(writer);
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));
        PostUpdateCommand command = PostFixture.updateCommandTo(rilog.getSlug());

        // when
        PostUpdateResult result = postService.update(command, post.getId(), writer.getId());

        // then
        Post savedPost = postRepository.findDetailById(post.getId()).orElseThrow();

        assertThat(result).isEqualTo(new PostUpdateResult(post.getId(), rilog.getSlug()));
        assertThat(detailOf(savedPost)).isEqualTo(command.toDetail());
    }

    @Test
    @DisplayName("개인 블로그 게시글을 팀 블로그로 수정하면 대상 팀 블로그에 소속되고 대상 소속을 반환한다.")
    void updateFromRilogToCologPersistsAndReturnsTargetAffiliation() {
        // given
        User writer = saveCompletedUser(24L, "팀이동작성자", "move-to-colog-writer");
        Blog rilog = saveRilog(writer);
        Blog targetColog = saveColog(writer, "chg-auth-target");
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));
        PostUpdateCommand command = PostFixture.updateCommandTo(targetColog.getSlug());

        // when
        PostUpdateResult result = postService.update(command, post.getId(), writer.getId());

        // then
        Post savedPost = postRepository.findDetailById(post.getId()).orElseThrow();

        assertThat(result).isEqualTo(new PostUpdateResult(post.getId(), targetColog.getSlug()));
        assertThat(savedPost.getColog().getId()).isEqualTo(targetColog.getId());
    }

    @Test
    @DisplayName("팀 블로그 게시글을 개인 블로그로 수정하면 팀 블로그 소속이 해제되고 개인 소속을 반환한다.")
    void updateFromCologToRilogRemovesAndReturnsRilogAffiliation() {
        // given
        User writer = saveCompletedUser(25L, "개인이동작성자", "move-to-rilog-writer");
        Blog rilog = saveRilog(writer);
        Blog colog = saveColog(writer, "chg-auth-source");
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));
        PostUpdateCommand command = PostFixture.updateCommandTo(rilog.getSlug());

        // when
        PostUpdateResult result = postService.update(command, post.getId(), writer.getId());

        // then
        Post savedPost = postRepository.findDetailById(post.getId()).orElseThrow();

        assertThat(result).isEqualTo(new PostUpdateResult(post.getId(), rilog.getSlug()));
        assertThat(savedPost.getColog()).isNull();
    }

    @Test
    @DisplayName("초안 게시글을 수정하면 예외가 발생하고 상세 정보가 유지된다.")
    void updateDraftPostThrowsAndPreservesDetail() {
        // given
        User writer = saveCompletedUser(26L, "초안작성자", "draft-chg-auth");
        Blog rilog = saveRilog(writer);
        Post draftPost = savePost(PostFixture.publicDraftRilogPost(rilog, writer));
        PostDetail originalDetail = detailOf(draftPost);
        PostUpdateCommand command = PostFixture.updateCommandTo(rilog.getSlug());

        // when & then
        assertThatThrownBy(() -> postService.update(command, draftPost.getId(), writer.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());

        Post savedPost = postRepository.findDetailById(draftPost.getId()).orElseThrow();
        assertThat(detailOf(savedPost)).isEqualTo(originalDetail);
    }

    @Test
    @DisplayName("작성자가 아닌 사용자가 게시글을 수정하면 예외가 발생하고 상세 정보가 유지된다.")
    void updateByNonWriterThrowsAndPreservesDetail() {
        // given
        User writer = saveCompletedUser(27L, "원본작성자", "original-writer");
        Blog rilog = saveRilog(writer);
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));
        User requester = saveCompletedUser(28L, "다른수정자", "other-chg-auth");
        PostDetail originalDetail = detailOf(post);
        PostUpdateCommand command = PostFixture.updateCommandTo(rilog.getSlug());

        // when & then
        assertThatThrownBy(() -> postService.update(command, post.getId(), requester.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());

        Post savedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(detailOf(savedPost)).isEqualTo(originalDetail);
    }

    @Test
    @DisplayName("현재 블로그에서 탈퇴한 작성자가 게시글을 수정하면 예외가 발생하고 상세 정보가 유지된다.")
    void updateByLeftCurrentBlogMemberThrowsAndPreservesDetail() {
        // given
        User cologOwner = saveCompletedUser(29L, "현재팀소유자", "current-colog-owner");
        Blog currentColog = saveColog(cologOwner, "left-current-colog");
        User writer = saveCompletedUser(30L, "현재탈퇴작성자", "left-current-writer");
        Blog rilog = saveRilog(writer);
        saveLeftMember(currentColog, writer);
        Post post = savePost(PostFixture.publicPublishedColog(rilog, currentColog, writer));
        PostDetail originalDetail = detailOf(post);
        PostUpdateCommand command = PostFixture.updateCommandTo(currentColog.getSlug());

        // when & then
        assertThatThrownBy(() -> postService.update(command, post.getId(), writer.getId()))
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());

        Post savedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(detailOf(savedPost)).isEqualTo(originalDetail);
    }

    @Test
    @DisplayName("대상 블로그에서 탈퇴한 작성자가 게시글을 수정하면 예외가 발생하고 게시글 상태가 유지된다.")
    void updateToBlogWhereWriterLeftThrowsAndPreservesPost() {
        // given
        User cologOwner = saveCompletedUser(31L, "대상팀소유자", "target-colog-owner");
        Blog targetColog = saveColog(cologOwner, "left-target-colog");
        User writer = saveCompletedUser(32L, "대상탈퇴작성자", "left-target-writer");
        Blog rilog = saveRilog(writer);
        saveLeftMember(targetColog, writer);
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));
        PostDetail originalDetail = detailOf(post);
        PostUpdateCommand command = PostFixture.updateCommandTo(targetColog.getSlug());

        // when & then
        assertThatThrownBy(() -> postService.update(command, post.getId(), writer.getId()))
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());

        Post savedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(detailOf(savedPost)).isEqualTo(originalDetail);
        assertThat(savedPost.getColog()).isNull();
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

    @Test
    @DisplayName("게시글 작성자는 개인 블로그의 발행된 게시글을 삭제할 수 있다.")
    void writerDeletesPublishedRilogPost() {
        // given
        User writer = saveCompletedUser(101L, "삭제작성자", "delete-rilog-writer");
        Blog rilog = saveRilog(writer);
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));

        // when
        postService.deletePublishedPost(post.getId(), writer.getId());

        // then
        Post deletedPost = postRepository.findById(post.getId()).orElseThrow();
        assertThat(deletedPost.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("팀 블로그에서 탈퇴한 작성자는 자신의 발행된 게시글을 삭제할 수 없다.")
    void leftWriterCannotDeleteOwnPublishedCologPost() {
        // given
        User owner = saveCompletedUser(102L, "삭제팀주인", "delete-colog-owner");
        Blog colog = saveColog(owner, "delete-writer-colog");
        User writer = saveCompletedUser(103L, "탈퇴작성자", "left-delete-writer");
        Blog rilog = saveRilog(writer);
        saveLeftMember(colog, writer);
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));

        // when & then
        assertThatThrownBy(() -> postService.deletePublishedPost(post.getId(), writer.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_DELETE_FORBIDDEN.getMessage());

        assertThat(postRepository.findById(post.getId()).orElseThrow().getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("팀 블로그의 활성 멤버는 자신이 작성한 게시글을 삭제할 수 있다.")
    void activeCologMemberDeletesOwnPost() {
        // given
        User owner = saveCompletedUser(122L, "자기글팀주인", "own-post-owner");
        Blog colog = saveColog(owner, "own-post-colog");
        User writer = saveCompletedUser(123L, "자기글작성자", "own-post-writer");
        Blog rilog = saveRilog(writer);
        saveActiveMember(colog, writer);
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));

        // when
        postService.deletePublishedPost(post.getId(), writer.getId());

        // then
        Post deletedPost = postRepository.findById(post.getId()).orElseThrow();
        assertThat(deletedPost.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("팀 블로그의 OWNER는 다른 작성자의 발행된 게시글을 삭제할 수 있다.")
    void cologOwnerDeletesAnotherWritersPublishedPost() {
        // given
        User owner = saveCompletedUser(104L, "권한팀주인", "auth-owner");
        Blog colog = saveColog(owner, "owner-delete-colog");
        User writer = saveCompletedUser(105L, "팀글작성자", "owner-delete-writer");
        Blog rilog = saveRilog(writer);
        saveActiveMember(colog, writer);
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));

        // when
        postService.deletePublishedPost(post.getId(), owner.getId());

        // then
        Post deletedPost = postRepository.findById(post.getId()).orElseThrow();
        assertThat(deletedPost.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("팀 블로그의 ADMIN은 다른 작성자의 발행된 게시글을 삭제할 수 있다.")
    void cologAdminDeletesAnotherWritersPublishedPost() {
        // given
        User owner = saveCompletedUser(106L, "관리팀주인", "admin-colog-owner");
        Blog colog = saveColog(owner, "admin-delete-colog");
        User writer = saveCompletedUser(107L, "관리팀작성자", "admin-delete-writer");
        Blog rilog = saveRilog(writer);
        saveActiveMember(colog, writer);
        User admin = saveCompletedUser(108L, "관리자", "post-delete-admin");
        saveActiveMember(colog, admin, ADMIN);
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));

        // when
        postService.deletePublishedPost(post.getId(), admin.getId());

        // then
        Post deletedPost = postRepository.findById(post.getId()).orElseThrow();
        assertThat(deletedPost.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("팀 블로그의 일반 멤버는 다른 작성자의 게시글을 삭제할 수 없다.")
    void cologMemberCannotDeleteAnotherWritersPost() {
        // given
        User owner = saveCompletedUser(109L, "일반팀주인", "member-colog-owner");
        Blog colog = saveColog(owner, "member-delete-colog");
        User writer = saveCompletedUser(110L, "일반팀작성자", "member-delete-writer");
        Blog rilog = saveRilog(writer);
        saveActiveMember(colog, writer);
        User member = saveCompletedUser(111L, "일반멤버", "post-delete-member");
        saveActiveMember(colog, member);
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));

        // when & then
        assertThatThrownBy(() -> postService.deletePublishedPost(post.getId(), member.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_DELETE_FORBIDDEN.getMessage());

        assertThat(postRepository.findById(post.getId()).orElseThrow().getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("팀 블로그에서 탈퇴한 ADMIN은 다른 작성자의 게시글을 삭제할 수 없다.")
    void leftCologAdminCannotDeleteAnotherWritersPost() {
        // given
        User owner = saveCompletedUser(112L, "탈퇴팀주인", "left-owner");
        Blog colog = saveColog(owner, "left-colog");
        User writer = saveCompletedUser(113L, "탈퇴팀작성자", "left-writer");
        Blog rilog = saveRilog(writer);
        saveActiveMember(colog, writer);
        User admin = saveCompletedUser(114L, "탈퇴관리자", "left-admin");
        blogMemberRepository.saveAndFlush(BlogMemberFixture.leftAdmin(colog, admin));
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));

        // when & then
        assertThatThrownBy(() -> postService.deletePublishedPost(post.getId(), admin.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_DELETE_FORBIDDEN.getMessage());

        assertThat(postRepository.findById(post.getId()).orElseThrow().getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("팀 블로그에 소속되지 않은 사용자는 다른 작성자의 게시글을 삭제할 수 없다.")
    void nonCologMemberCannotDeleteAnotherWritersPost() {
        // given
        User owner = saveCompletedUser(115L, "비소속팀주인", "none-owner");
        Blog colog = saveColog(owner, "none-colog");
        User writer = saveCompletedUser(116L, "비소속팀작성자", "none-writer");
        Blog rilog = saveRilog(writer);
        saveActiveMember(colog, writer);
        User requester = saveCompletedUser(117L, "비소속요청자", "none-requester");
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));

        // when & then
        assertThatThrownBy(() -> postService.deletePublishedPost(post.getId(), requester.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_DELETE_FORBIDDEN.getMessage());

        assertThat(postRepository.findById(post.getId()).orElseThrow().getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("개인 블로그의 작성자가 아닌 사용자는 게시글을 삭제할 수 없다.")
    void nonWriterCannotDeleteRilogPost() {
        // given
        User writer = saveCompletedUser(118L, "개인글작성자", "forbid-writer");
        Blog rilog = saveRilog(writer);
        User requester = saveCompletedUser(119L, "개인글요청자", "forbid-requester");
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));

        // when & then
        assertThatThrownBy(() -> postService.deletePublishedPost(post.getId(), requester.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_DELETE_FORBIDDEN.getMessage());

        assertThat(postRepository.findById(post.getId()).orElseThrow().getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("초안 게시글을 삭제하면 게시글을 찾을 수 없다는 예외가 발생한다.")
    void deleteDraftPostThrowsPostNotFound() {
        // given
        User writer = saveCompletedUser(120L, "초안작성자", "draft-delete-writer");
        Blog rilog = saveRilog(writer);
        Post draft = savePost(PostFixture.publicDraftRilogPost(rilog, writer));

        // when & then
        assertThatThrownBy(() -> postService.deletePublishedPost(draft.getId(), writer.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("이미 삭제된 게시글을 삭제하면 게시글을 찾을 수 없다는 예외가 발생한다.")
    void deleteDeletedPostThrowsPostNotFound() {
        // given
        User writer = saveCompletedUser(121L, "기삭제작성자", "deleted-writer");
        Blog rilog = saveRilog(writer);
        Post deletedPost = savePost(PostFixture.deletedPublicPublishedRilogPost(rilog, writer));

        // when & then
        assertThatThrownBy(() -> postService.deletePublishedPost(deletedPost.getId(), writer.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("존재하지 않는 게시글을 삭제하면 게시글을 찾을 수 없다는 예외가 발생한다.")
    void deleteMissingPostThrowsPostNotFound() {
        // when & then
        assertThatThrownBy(() -> postService.deletePublishedPost(Long.MAX_VALUE, Long.MAX_VALUE))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_NOT_FOUND.getMessage());
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
        Blog blog = blogRepository.saveAndFlush(Blog.createRilog(owner));
        saveOwnerMembership(blog, owner);
        return blog;
    }

    private Blog saveColog(User owner, String slug) {
        Blog blog = blogRepository.saveAndFlush(Blog.createColog(owner, slug, BlogFixture.cologProfile()));
        saveOwnerMembership(blog, owner);
        return blog;
    }

    private BlogMember saveOwnerMembership(Blog blog, User owner) {
        return blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(blog, owner));
    }

    private BlogMember saveActiveMember(Blog blog, User user) {
        return saveActiveMember(blog, user, MEMBER);
    }

    private BlogMember saveActiveMember(Blog blog, User user, BlogPermission permission) {
        return blogMemberRepository.saveAndFlush(BlogMember.invite(
                blog,
                user,
                "개발자",
                permission,
                PUBLISHED_AT
        ));
    }

    private BlogMember saveLeftMember(Blog blog, User user) {
        return blogMemberRepository.saveAndFlush(BlogMemberFixture.leftMember(blog, user));
    }

    private BlogMember saveDeletedActiveMember(Blog blog, User user) {
        BlogMember member = saveActiveMember(blog, user);
        member.delete();
        return blogMemberRepository.saveAndFlush(member);
    }

    private Post savePost(Post post) {
        return postRepository.saveAndFlush(post);
    }

    private PostDetail detailOf(Post post) {
        return new PostDetail(
                post.getTitle(),
                post.getContent().getContent(),
                post.getCategory(),
                post.getVisibility(),
                post.getThumbnailImageUrl()
        );
    }

}
