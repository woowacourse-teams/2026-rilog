package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.comment.entity.CommentAnchorSelection;
import kr.rilog.domain.comment.entity.vo.Selection;
import kr.rilog.domain.comment.repository.CommentAnchorSelectionRepository;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.owner.CologOwnerResponse;
import kr.rilog.domain.post.controller.dto.response.owner.RilogOwnerResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;

import static kr.rilog.domain.blog.entity.enums.BlogPermission.MEMBER;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.ALREADY_BLOG_MEMBER_LEFT;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.COLOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.exception.PostErrorInformation.NOT_POST_AUTHOR;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_DELETE_FORBIDDEN;
import static kr.rilog.domain.post.exception.PostErrorInformation.PRIVATE_POST_READ_FORBIDDEN;
import static kr.rilog.support.fixure.PostContentFixture.PARAGRAPH_BLOCK_ID;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class PostServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime PUBLISHED_AT = LocalDateTime.of(2026, 8, 23, 12, 0);

    @Autowired
    private PostCommandService postCommandService;
    @Autowired
    private PostQueryService postQueryService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CommentAnchorSelectionRepository commentAnchorSelectionRepository;

    @Test
    @DisplayName("개인 블로그에 게시글을 발행하면 게시글과 초기 조회수 0이 함께 저장된다.")
    void publishToRilogPersistsPostAndInitialViewCount() {
        // given
        User writer = saveCompletedUser(1L, "개인작성자", "rilog_writer");
        Blog rilog = saveRilog(writer);
        PostSaveCommand command = PostFixture.publicPostPublishCommand(rilog.getSlug());

        // when
        PostPublishResult result = postCommandService.publish(command, writer.getId());

        // then
        assertThat(postRepository.findById(result.postId())).isPresent();
        assertThat(jdbcTemplate.queryForObject(
                "select view_count from post_view_count where post_id = ?", Long.class, result.postId()
        )).isZero();
    }

    @Test
    @DisplayName("팀 블로그의 활성 멤버가 게시글을 발행하면 팀 블로그와 작성자의 개인 블로그 소속이 함께 저장된다.")
    void publishToCologPersistsCologAndWriterRilogAffiliations() {
        // given
        User writer = saveCompletedUser(2L, "팀작성자", "colog_writer");
        Blog rilog = saveRilog(writer);
        Blog colog = saveColog(writer, "team_colog");
        PostSaveCommand command = PostFixture.publicPostPublishCommand(colog.getSlug());

        // when
        PostPublishResult result = postCommandService.publish(command, writer.getId());

        // then
        Post savedPost = postRepository.findDetailById(result.postId())
                .orElseThrow();

        assertSoftly(softly -> {
            softly.assertThat(savedPost.getUser().getId()).isEqualTo(writer.getId());
            softly.assertThat(savedPost.getRilog().getId()).isEqualTo(rilog.getId());
            softly.assertThat(savedPost.getColog().getId()).isEqualTo(colog.getId());
        });
    }

    @Test
    @DisplayName("팀 블로그의 활성 멤버가 아니면 게시글이 저장되지 않는다.")
    void publishToCologThrowsAndDoesNotPersistPostWhenWriterIsNotActiveMember() {
        // given
        User owner = saveCompletedUser(3L, "팀소유자", "team_owner");
        Blog colog = saveColog(owner, "owner_colog");
        User writer = saveCompletedUser(4L, "비멤버", "non_member");
        saveRilog(writer);

        // when & then
        assertThatThrownBy(() -> postCommandService.publish(
                PostFixture.publicPostPublishCommand(colog.getSlug()),
                writer.getId()
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(COLOG_POST_PUBLISH_FORBIDDEN.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("게시글 본문을 수정하면 활성 인라인 선택 범위의 변경 위치가 저장된다.")
    void updatePersistsRelocatedCommentAnchorSelection() {
        // given
        User writer = saveCompletedUser(33L, "인라인수정작성자", "inline_update_writer");
        Blog rilog = saveRilog(writer);
        Post post = savePost(PostFixture.publicPublishedRilogPostWithParagraph(rilog, writer, "가나다라"));
        CommentAnchorSelection anchorSelection = commentAnchorSelectionRepository.saveAndFlush(
                CommentAnchorSelection.create(
                        post,
                        Selection.select(post.findTextBlock(PARAGRAPH_BLOCK_ID), 2, 4, "다라")
                )
        );
        PostUpdateCommand command = new PostUpdateCommand(
                rilog.getSlug(),
                post.getTitle(),
                content(paragraph("가나나다라")).getContent(),
                post.getCategory(),
                post.getVisibility(),
                post.getThumbnailImageUrl(),
                null
        );

        // when
        postCommandService.update(command, post.getId(), writer.getId());

        // then
        CommentAnchorSelection savedAnchorSelection = commentAnchorSelectionRepository
                .findById(anchorSelection.getId())
                .orElseThrow();
        assertThat(savedAnchorSelection.getSelection())
                .isEqualTo(Selection.of(PARAGRAPH_BLOCK_ID, 3, 5, "다라"));
    }

    @Test
    @DisplayName("개인 블로그 게시글을 팀 블로그로 수정하면 대상 팀 블로그 소속이 저장된다.")
    void updateFromRilogToCologPersistsTargetAffiliation() {
        // given
        User writer = saveCompletedUser(24L, "팀이동작성자", "move_to_colog_writer");
        Blog rilog = saveRilog(writer);
        Blog targetColog = saveColog(writer, "chg_auth_target");
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));
        PostUpdateCommand command = PostFixture.updateCommandTo(targetColog.getSlug());

        // when
        postCommandService.update(command, post.getId(), writer.getId());

        // then
        Post savedPost = postRepository.findDetailById(post.getId()).orElseThrow();

        assertThat(savedPost.getColog().getId()).isEqualTo(targetColog.getId());
    }

    @Test
    @DisplayName("팀 블로그 게시글을 개인 블로그로 수정하면 저장된 팀 블로그 소속이 해제된다.")
    void updateFromCologToRilogRemovesCologAffiliation() {
        // given
        User writer = saveCompletedUser(25L, "개인이동작성자", "move_to_rilog_writer");
        Blog rilog = saveRilog(writer);
        Blog colog = saveColog(writer, "chg_auth_source");
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));
        PostUpdateCommand command = PostFixture.updateCommandTo(rilog.getSlug());

        // when
        postCommandService.update(command, post.getId(), writer.getId());

        // then
        Post savedPost = postRepository.findDetailById(post.getId()).orElseThrow();

        assertThat(savedPost.getColog()).isNull();
    }

    @Test
    @DisplayName("작성자가 아닌 사용자가 게시글을 수정하면 예외가 발생하고 상세 정보가 유지된다.")
    void updateByNonWriterThrowsAndPreservesDetail() {
        // given
        User writer = saveCompletedUser(27L, "원본작성자", "original_writer");
        Blog rilog = saveRilog(writer);
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));
        User requester = saveCompletedUser(28L, "다른수정자", "other_chg_auth");
        PostDetail originalDetail = detailOf(post);
        PostUpdateCommand command = PostFixture.updateCommandTo(rilog.getSlug());

        // when & then
        assertThatThrownBy(() -> postCommandService.update(command, post.getId(), requester.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());

        Post savedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(detailOf(savedPost)).isEqualTo(originalDetail);
    }

    @Test
    @DisplayName("현재 블로그에서 탈퇴한 작성자가 게시글을 수정하면 예외가 발생하고 상세 정보가 유지된다.")
    void updateByLeftCurrentBlogMemberThrowsAndPreservesDetail() {
        // given
        User cologOwner = saveCompletedUser(29L, "현재팀소유자", "current_colog_owner");
        Blog currentColog = saveColog(cologOwner, "left_current_colog");
        User writer = saveCompletedUser(30L, "현재탈퇴작성자", "left_current_writer");
        Blog rilog = saveRilog(writer);
        saveLeftMember(currentColog, writer);
        Post post = savePost(PostFixture.publicPublishedColog(rilog, currentColog, writer));
        PostDetail originalDetail = detailOf(post);
        PostUpdateCommand command = PostFixture.updateCommandTo(currentColog.getSlug());

        // when & then
        assertThatThrownBy(() -> postCommandService.update(command, post.getId(), writer.getId()))
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());

        Post savedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(detailOf(savedPost)).isEqualTo(originalDetail);
    }

    @Test
    @DisplayName("대상 블로그에서 탈퇴한 작성자가 게시글을 수정하면 예외가 발생하고 게시글 상태가 유지된다.")
    void updateToBlogWhereWriterLeftThrowsAndPreservesPost() {
        // given
        User cologOwner = saveCompletedUser(31L, "대상팀소유자", "target_colog_owner");
        Blog targetColog = saveColog(cologOwner, "left_target_colog");
        User writer = saveCompletedUser(32L, "대상탈퇴작성자", "left_target_writer");
        Blog rilog = saveRilog(writer);
        saveLeftMember(targetColog, writer);
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));
        PostDetail originalDetail = detailOf(post);
        PostUpdateCommand command = PostFixture.updateCommandTo(targetColog.getSlug());

        // when & then
        assertThatThrownBy(() -> postCommandService.update(command, post.getId(), writer.getId()))
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());

        Post savedPost = postRepository.findDetailById(post.getId()).orElseThrow();
        assertThat(detailOf(savedPost)).isEqualTo(originalDetail);
        assertThat(savedPost.getColog()).isNull();
    }

    @Test
    @DisplayName("개인 블로그 공개 게시글의 주소로 저장된 본문과 작성자 및 블로그를 조회한다.")
    void readPublicRilogPostLoadsStoredContentAndAffiliation() {
        // given
        User writer = saveCompletedUser(11L, "공개글작성자", "public_post_writer");
        Blog rilog = saveRilog(writer);
        Post post = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));

        // when
        PostDetailResponse result = postQueryService.readPostDetailByCanonicalPath(rilog.getSlug(), post.getId(), null);

        // then
        assertSoftly(softly -> {
            softly.assertThat(result.title()).isEqualTo(post.getTitle());
            softly.assertThat(result.content()).isEqualTo(post.getContent().getContent());
            softly.assertThat(result.author().userId()).isEqualTo(writer.getId());
            softly.assertThat(result.owner()).isInstanceOfSatisfying(RilogOwnerResponse.class,
                    owner -> assertThat(owner.blogId()).isEqualTo(rilog.getId()));
        });
    }

    @Test
    @DisplayName("개인 블로그의 비공개 게시글을 다른 사용자가 조회하면 예외가 발생한다.")
    void readPrivateRilogPostThrowsWhenRequesterIsNotWriter() {
        // given
        User writer = saveCompletedUser(14L, "비공개글주인", "private_owner");
        Blog rilog = saveRilog(writer);
        Post privatePost = savePost(PostFixture.privatePublishedRilogPost(rilog, writer));
        User otherUser = saveCompletedUser(15L, "비공개타인", "private_outsider");

        // when & then
        assertThatThrownBy(() -> postQueryService.readPostDetailByCanonicalPath(rilog.getSlug(), privatePost.getId(), otherUser.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(PRIVATE_POST_READ_FORBIDDEN.getMessage());
    }

    @ParameterizedTest(name = "수정용 상세 조회: {0}")
    @ValueSource(booleans = {false, true})
    @DisplayName("팀 블로그 게시글 상세 조회는 저장된 소속과 조회 권한에 따른 조회수를 반환한다.")
    void readCologPostLoadsAffiliationAndAppliesViewerPermissions(boolean editable) {
        // given
        User owner = saveCompletedUser(18L, "팀주인", "detail_colog_owner");
        Blog rilog = saveRilog(owner);
        Blog colog = saveColog(owner, "detail_colog");
        Post readTarget = savePost(PostFixture.publicPublishedColog(rilog, colog, owner));

        // when
        PostDetailResponse result = editable
                ? postQueryService.readEditablePostDetail(readTarget.getId(), owner.getId())
                : postQueryService.readPostDetailByCanonicalPath(colog.getSlug(), readTarget.getId(), null);

        // then
        assertSoftly(softly -> {
            softly.assertThat(result.owner()).isInstanceOfSatisfying(CologOwnerResponse.class,
                    profile -> assertThat(profile.blogId()).isEqualTo(colog.getId()));
            softly.assertThat(result.viewerPermissions())
                    .isEqualTo(PostDetailResponse.ViewerPermissionsResponse.of(editable, editable));
            softly.assertThat(result.viewCount()).isEqualTo(editable ? 0L : null);
        });
    }

    @Test
    @DisplayName("팀 블로그에서 탈퇴한 작성자는 자신의 발행된 게시글을 삭제할 수 없다.")
    void leftWriterCannotDeleteOwnPublishedCologPost() {
        // given
        User owner = saveCompletedUser(102L, "삭제팀주인", "delete_colog_owner");
        Blog colog = saveColog(owner, "delete_writer_colog");
        User writer = saveCompletedUser(103L, "탈퇴작성자", "left_delete_writer");
        Blog rilog = saveRilog(writer);
        saveLeftMember(colog, writer);
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));

        // when & then
        assertThatThrownBy(() -> postCommandService.deletePublishedPost(post.getId(), writer.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(POST_DELETE_FORBIDDEN.getMessage());

        assertThat(postRepository.findById(post.getId()).orElseThrow().getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("팀 블로그의 활성 멤버는 자신이 작성한 게시글을 삭제할 수 있다.")
    void activeCologMemberDeletesOwnPost() {
        // given
        User owner = saveCompletedUser(122L, "자기글팀주인", "own_post_owner");
        Blog colog = saveColog(owner, "own_post_colog");
        User writer = saveCompletedUser(123L, "자기글작성자", "own_post_writer");
        Blog rilog = saveRilog(writer);
        saveActiveMember(colog, writer);
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));

        // when
        postCommandService.deletePublishedPost(post.getId(), writer.getId());

        // then
        Post deletedPost = postRepository.findById(post.getId()).orElseThrow();
        assertThat(deletedPost.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("팀 블로그의 OWNER는 다른 작성자의 발행된 게시글을 삭제할 수 있다.")
    void cologOwnerDeletesAnotherWritersPublishedPost() {
        // given
        User owner = saveCompletedUser(104L, "권한팀주인", "auth_owner");
        Blog colog = saveColog(owner, "owner_delete_colog");
        User writer = saveCompletedUser(105L, "팀글작성자", "owner_delete_writer");
        Blog rilog = saveRilog(writer);
        saveActiveMember(colog, writer);
        Post post = savePost(PostFixture.publicPublishedColog(rilog, colog, writer));

        // when
        postCommandService.deletePublishedPost(post.getId(), owner.getId());

        // then
        Post deletedPost = postRepository.findById(post.getId()).orElseThrow();
        assertThat(deletedPost.getDeletedAt()).isNotNull();
    }

    private User saveCompletedUser(long githubId, String nickname, String slug) {
        User user = UserFixture.user(githubId, "github_user_" + githubId);
        user.completeOnboarding(
                nickname,
                slug,
                "기록하는 개발자입니다.",
                "https://example.com/users/" + githubId + ".png",
                "https://github.com/github_user_" + githubId,
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

    private Post savePost(Post post) {
        Post saved = postRepository.saveAndFlush(post);
        if (saved.getStatus() == PUBLISHED) {
            jdbcTemplate.update("insert into post_view_count (post_id, view_count) values (?, 0)", saved.getId());
        }
        return saved;
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
