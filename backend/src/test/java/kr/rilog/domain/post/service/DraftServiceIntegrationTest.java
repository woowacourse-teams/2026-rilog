package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.DraftOverwriteCommand;
import kr.rilog.domain.post.service.dto.command.DraftPublishCommand;
import kr.rilog.domain.post.service.dto.result.DraftDetailResult;
import kr.rilog.domain.post.service.dto.result.DraftListResult;
import kr.rilog.domain.user.entity.User;
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

import static kr.rilog.domain.blog.exception.BlogErrorInformation.ALREADY_BLOG_MEMBER_LEFT;
import static kr.rilog.domain.post.entity.enums.PostStatus.DRAFT;
import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.exception.PostErrorInformation.DRAFT_NOT_FOUND;
import static kr.rilog.support.fixure.PostFixture.overwrittenDraftCommand;
import static kr.rilog.support.fixure.PostFixture.publicDraftPublishCommand;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class DraftServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime BASE_PUBLISHED_AT = LocalDateTime.of(2026, 8, 25, 12, 0);

    @Autowired
    private DraftCommandService draftCommandService;
    @Autowired
    private DraftQueryService draftQueryService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private PostRepository postRepository;

    @Test
    @DisplayName("임시저장 목록은 요청자가 작성한 미삭제 초안만 반환한다.")
    void readMyDraftListReturnsOnlyActiveDraftsWrittenByRequester() {
        // given
        User requester = saveCompletedUser(201L, "초안작성자", "draft_writer");
        Blog rilog = saveRilog(requester);
        User otherWriter = saveCompletedUser(202L, "다른작성자", "other_writer");
        Blog otherRilog = saveRilog(otherWriter);
        Post draft = savePost(PostFixture.draftRilogPostAt(rilog, requester, "내 초안", BASE_PUBLISHED_AT));
        savePost(PostFixture.draftRilogPostAt(otherRilog, otherWriter, "남의 초안", BASE_PUBLISHED_AT));
        savePost(PostFixture.publicPublishedRilogPost(rilog, requester));
        savePost(PostFixture.deletedDraftRilogPostAt(rilog, requester, "삭제한 초안", BASE_PUBLISHED_AT));

        // when
        DraftListResult result = draftQueryService.readMyDraftList(requester.getId(), 0, 10);

        // then
        assertThat(result.drafts()).extracting(DraftListResult.DraftItemResult::draftId).containsExactly(draft.getId());
    }

    @Test
    @DisplayName("작성자가 자신의 미삭제 초안을 상세 조회하면 저장된 내용을 반환한다.")
    void getMyDraftReturnsActiveDraftWrittenByRequester() {
        // given
        User requester = saveCompletedUser();
        Blog rilog = saveRilog(requester);
        Post draft = savePost(PostFixture.draftRilogPostAt(
                rilog,
                requester,
                "상세 조회할 초안",
                BASE_PUBLISHED_AT
        ));

        // when
        DraftDetailResult result = draftQueryService.getMyDraft(draft.getId(), requester.getId());

        // then
        assertThat(result.draftId()).isEqualTo(draft.getId());
        assertThat(result.content()).isEqualTo(draft.getContent().getContent());
    }

    @Test
    @DisplayName("작성자가 자신의 초안을 덮어쓰면 새로운 내용과 임시저장 시각이 저장된다.")
    void overwriteDraftPersistsNewContentAndPublishedAt() {
        // given
        User writer = saveCompletedUser();
        Blog rilog = saveRilog(writer);
        Post draft = savePost(PostFixture.draftRilogPostAt(
                rilog,
                writer,
                "덮어쓰기 전 제목",
                BASE_PUBLISHED_AT
        ));
        DraftOverwriteCommand command = overwrittenDraftCommand();

        // when
        draftCommandService.overwriteDraft(command, draft.getId(), writer.getId());

        // then
        Post overwrittenDraft = postRepository.findById(draft.getId()).orElseThrow();
        assertSoftly(softly -> {
            softly.assertThat(overwrittenDraft.getTitle()).isEqualTo(command.title());
            softly.assertThat(overwrittenDraft.getContent()).isEqualTo(PostContent.from(command.content()));
            softly.assertThat(overwrittenDraft.getPublishedAt()).isAfter(BASE_PUBLISHED_AT);
        });
    }

    @Test
    @DisplayName("발행된 글을 초안으로 덮어쓰면 초안을 찾을 수 없다는 예외가 발생하고 기존 내용이 유지된다.")
    void overwriteDraftThrowsAndPreservesContentWhenPostIsPublished() {
        // given
        User writer = saveCompletedUser();
        Blog rilog = saveRilog(writer);
        Post publishedPost = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));

        // when & then
        assertThatThrownBy(() -> draftCommandService.overwriteDraft(
                overwrittenDraftCommand(),
                publishedPost.getId(),
                writer.getId()
        ))
                .isInstanceOf(PostException.class)
                .hasMessage(DRAFT_NOT_FOUND.getMessage());

        Post preservedPost = postRepository.findById(publishedPost.getId()).orElseThrow();
        assertThat(preservedPost.getTitle()).isEqualTo(publishedPost.getTitle());
    }

    @Test
    @DisplayName("삭제된 초안을 덮어쓰면 초안을 찾을 수 없다는 예외가 발생하고 삭제 상태가 유지된다.")
    void overwriteDraftThrowsAndPreservesDeletionWhenDraftIsDeleted() {
        // given
        User writer = saveCompletedUser();
        Blog rilog = saveRilog(writer);
        Post deletedDraft = savePost(PostFixture.deletedDraftRilogPostAt(
                rilog,
                writer,
                "삭제된 초안",
                BASE_PUBLISHED_AT
        ));

        // when & then
        assertThatThrownBy(() -> draftCommandService.overwriteDraft(
                overwrittenDraftCommand(),
                deletedDraft.getId(),
                writer.getId()
        ))
                .isInstanceOf(PostException.class)
                .hasMessage(DRAFT_NOT_FOUND.getMessage());

        Post preservedDraft = postRepository.findById(deletedDraft.getId()).orElseThrow();
        assertThat(preservedDraft.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("챕터를 지정하지 않고 초안을 개인 블로그에 발행하면 미분류 상태로 게시글 정보가 저장된다.")
    void publishDraftToRilogPersistsDetailAndPublishedState() {
        // given
        User writer = saveCompletedUser(201L, "발행작성자", "publish_writer");
        Blog rilog = saveRilog(writer);
        saveOwnerMembership(rilog, writer);
        Post draft = savePost(PostFixture.draftRilogPostAt(
                rilog,
                writer,
                "발행 전 제목",
                BASE_PUBLISHED_AT
        ));
        DraftPublishCommand command = publicDraftPublishCommand(rilog.getSlug());

        // when
        draftCommandService.publishDraft(command, draft.getId(), writer.getId());

        // then
        Post publishedPost = postRepository.findById(draft.getId()).orElseThrow();
        PostDetail publishedDetail = new PostDetail(
                publishedPost.getTitle(),
                publishedPost.getContent().getContent(),
                publishedPost.getCategory(),
                publishedPost.getVisibility(),
                publishedPost.getThumbnailImageUrl()
        );
        assertSoftly(softly -> {
            softly.assertThat(publishedDetail).isEqualTo(command.toDetail());
            softly.assertThat(publishedPost.getStatus()).isEqualTo(PUBLISHED);
            softly.assertThat(publishedPost.getPublishedAt()).isAfter(BASE_PUBLISHED_AT);
            softly.assertThat(publishedPost.getColog()).isNull();
            softly.assertThat(publishedPost.getChapter()).isNull();
        });
    }

    @Test
    @DisplayName("작성자가 초안을 팀 블로그에 발행하면 개인 블로그와 대상 팀 블로그 소속이 저장된다.")
    void publishDraftToCologPersistsRilogAndCologAffiliation() {
        // given
        User writer = saveCompletedUser(201L, "팀글작성자", "colog_writer");
        Blog rilog = saveRilog(writer);
        Blog colog = blogRepository.saveAndFlush(
                Blog.createColog(writer, "team_blog", BlogFixture.cologProfile())
        );
        saveOwnerMembership(rilog, writer);
        saveOwnerMembership(colog, writer);
        Post draft = savePost(PostFixture.draftRilogPostAt(
                rilog,
                writer,
                "팀 블로그 발행 전 제목",
                BASE_PUBLISHED_AT
        ));

        // when
        draftCommandService.publishDraft(
                publicDraftPublishCommand(colog.getSlug()),
                draft.getId(),
                writer.getId()
        );

        // then
        Post publishedPost = postRepository.findById(draft.getId()).orElseThrow();
        assertSoftly(softly -> {
            softly.assertThat(publishedPost.getRilog().getId()).isEqualTo(rilog.getId());
            softly.assertThat(publishedPost.getColog().getId()).isEqualTo(colog.getId());
        });
    }

    @Test
    @DisplayName("활성 팀 멤버가 아닌 작성자가 초안을 발행하면 예외가 발생하고 초안 상태가 유지된다.")
    void publishDraftThrowsAndPreservesDraftWhenTargetMembershipIsInactive() {
        // given
        User writer = saveCompletedUser(201L, "탈퇴멤버", "left_member");
        Blog rilog = saveRilog(writer);
        saveOwnerMembership(rilog, writer);
        User cologOwner = saveCompletedUser(202L, "팀소유자", "team_owner");
        Blog colog = blogRepository.saveAndFlush(
                Blog.createColog(cologOwner, "inactive_team", BlogFixture.cologProfile())
        );
        blogMemberRepository.saveAndFlush(BlogMemberFixture.leftMember(colog, writer));
        Post draft = savePost(PostFixture.draftRilogPostAt(
                rilog,
                writer,
                "유지할 초안",
                BASE_PUBLISHED_AT
        ));

        // when & then
        assertThatThrownBy(() -> draftCommandService.publishDraft(
                publicDraftPublishCommand(colog.getSlug()),
                draft.getId(),
                writer.getId()
        ))
                .isInstanceOf(BlogException.class)
                .hasMessage(ALREADY_BLOG_MEMBER_LEFT.getMessage());

        assertThat(postRepository.findById(draft.getId()).orElseThrow().getStatus()).isEqualTo(DRAFT);
    }

    @Test
    @DisplayName("작성자가 자신의 초안을 삭제하면 삭제 상태가 저장된다.")
    void deleteDraftPersistsDeletion() {
        // given
        User writer = saveCompletedUser();
        Blog rilog = saveRilog(writer);
        Post draft = savePost(PostFixture.draftRilogPostAt(
                rilog,
                writer,
                "삭제할 초안",
                BASE_PUBLISHED_AT
        ));

        // when
        draftCommandService.deleteDraft(draft.getId(), writer.getId());

        // then
        Post deletedDraft = postRepository.findById(draft.getId()).orElseThrow();
        assertThat(deletedDraft.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("발행된 글을 초안으로 삭제하면 초안을 찾을 수 없다는 예외가 발생하고 삭제되지 않는다.")
    void deleteDraftThrowsAndPreservesPostWhenPostIsPublished() {
        // given
        User writer = saveCompletedUser();
        Blog rilog = saveRilog(writer);
        Post publishedPost = savePost(PostFixture.publicPublishedRilogPost(rilog, writer));

        // when & then
        assertThatThrownBy(() -> draftCommandService.deleteDraft(publishedPost.getId(), writer.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(DRAFT_NOT_FOUND.getMessage());

        assertThat(postRepository.findById(publishedPost.getId()).orElseThrow().getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("이미 삭제된 초안을 삭제하면 초안을 찾을 수 없다는 예외가 발생한다.")
    void deleteDraftThrowsWhenDraftIsAlreadyDeleted() {
        // given
        User writer = saveCompletedUser();
        Blog rilog = saveRilog(writer);
        Post deletedDraft = savePost(PostFixture.deletedDraftRilogPostAt(
                rilog,
                writer,
                "이미 삭제된 초안",
                BASE_PUBLISHED_AT
        ));

        // when & then
        assertThatThrownBy(() -> draftCommandService.deleteDraft(deletedDraft.getId(), writer.getId()))
                .isInstanceOf(PostException.class)
                .hasMessage(DRAFT_NOT_FOUND.getMessage());
    }

    private User saveCompletedUser() {
        return userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("초안작성자", "draft_writer")
        );
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

    private Post savePost(Post post) {
        return postRepository.saveAndFlush(post);
    }

    private Blog saveRilog(User writer) {
        return blogRepository.saveAndFlush(Blog.createRilog(writer));
    }

    private BlogMember saveOwnerMembership(Blog blog, User user) {
        return blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(blog, user));
    }

}
