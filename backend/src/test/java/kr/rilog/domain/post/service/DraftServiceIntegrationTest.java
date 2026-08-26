package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.post.service.dto.result.DraftIdResult;
import kr.rilog.domain.post.service.dto.result.DraftListResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.PostFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_NOT_FOUND;
import static kr.rilog.domain.post.entity.enums.PostStatus.DRAFT;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PRIVATE;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static kr.rilog.support.fixure.PostFixture.initialDraftSaveCommand;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class DraftServiceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime BASE_PUBLISHED_AT = LocalDateTime.of(2026, 8, 25, 12, 0);

    @Autowired
    private DraftService draftService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private PostRepository postRepository;

    @Test
    @DisplayName("초안을 최초 저장하면 입력한 내용과 초안 전용 상태가 저장된다.")
    void saveDraftPersistsCommandContentAndDraftState() {
        // given
        User writer = saveCompletedUser();
        saveRilog(writer);
        DraftSaveCommand command = initialDraftSaveCommand();

        // when
        DraftIdResult result = draftService.saveDraft(command, writer.getId());

        // then
        Post savedDraft = postRepository.findById(result.draftId()).orElseThrow();

        assertSoftly(softly -> {
            softly.assertThat(result).isEqualTo(new DraftIdResult(savedDraft.getId()));
            softly.assertThat(savedDraft.getTitle()).isEqualTo(command.title());
            softly.assertThat(savedDraft.getContent()).isEqualTo(command.content());
            softly.assertThat(savedDraft.getStatus()).isEqualTo(DRAFT);
            softly.assertThat(savedDraft.getVisibility()).isEqualTo(PRIVATE);
            softly.assertThat(savedDraft.getCategory()).isNull();
            softly.assertThat(savedDraft.getThumbnailImageUrl()).isNull();
        });
    }

    @Test
    @DisplayName("초안을 최초 저장하면 작성자와 작성자의 개인 블로그에 소속된다.")
    void saveDraftPersistsWriterAndRilogAffiliation() {
        // given
        User writer = saveCompletedUser();
        Blog rilog = saveRilog(writer);

        // when
        DraftIdResult result = draftService.saveDraft(initialDraftSaveCommand(), writer.getId());

        // then
        Post savedDraft = postRepository.findById(result.draftId()).orElseThrow();

        assertSoftly(softly -> {
            softly.assertThat(savedDraft.getUser().getId()).isEqualTo(writer.getId());
            softly.assertThat(savedDraft.getRilog().getId()).isEqualTo(rilog.getId());
            softly.assertThat(savedDraft.getColog()).isNull();
        });
    }

    @Test
    @DisplayName("존재하지 않는 사용자가 초안을 저장하면 예외가 발생하고 초안은 저장되지 않는다.")
    void saveDraftThrowsAndDoesNotPersistWhenUserDoesNotExist() {
        // when & then
        assertThatThrownBy(() -> draftService.saveDraft(initialDraftSaveCommand(), Long.MIN_VALUE))
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("개인 블로그가 없는 사용자가 초안을 저장하면 예외가 발생하고 초안은 저장되지 않는다.")
    void saveDraftThrowsAndDoesNotPersistWhenRilogDoesNotExist() {
        // given
        User writer = saveCompletedUser();

        // when & then
        assertThatThrownBy(() -> draftService.saveDraft(initialDraftSaveCommand(), writer.getId()))
                .isInstanceOf(BlogException.class)
                .hasMessage(RILOG_NOT_FOUND.getMessage());

        assertThat(postRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("임시저장 목록은 요청자가 작성한 미삭제 초안만 반환한다.")
    void readMyDraftListReturnsOnlyActiveDraftsWrittenByRequester() {
        // given
        User requester = saveCompletedUser(201L, "초안작성자", "draft-writer");
        Blog requesterRilog = saveRilog(requester);
        User otherWriter = saveCompletedUser(202L, "다른작성자", "other-writer");
        Blog otherRilog = saveRilog(otherWriter);

        Post expectedDraft = savePost(PostFixture.draftRilogPostAt(requesterRilog, requester, "조회할 초안", BASE_PUBLISHED_AT));
        savePost(PostFixture.draftRilogPostAt(otherRilog, otherWriter, "다른 사용자의 초안", BASE_PUBLISHED_AT));
        savePost(PostFixture.publicPublishedRilogPost(requesterRilog, requester));
        savePost(
                PostFixture.deletedDraftRilogPostAt(
                        requesterRilog,
                        requester,
                        "삭제된 초안",
                        BASE_PUBLISHED_AT.plusMinutes(1)
                )
        );

        // when
        DraftListResult result = draftService.readMyDraftList(requester.getId(), 0, 10);

        // then
        assertThat(result.drafts()).containsExactly(new DraftListResult.DraftItemResult(
                expectedDraft.getId(),
                expectedDraft.getTitle(),
                expectedDraft.getPublishedAt()
        ));
    }

    @Test
    @DisplayName("임시저장 목록은 저장 시각과 초안 아이디의 내림차순으로 정렬한다.")
    void readMyDraftListOrdersByPublishedAtAndIdDescending() {
        // given
        User requester = saveCompletedUser();
        Blog rilog = saveRilog(requester);
        Post firstSameTimeDraft = savePost(PostFixture.draftRilogPostAt(rilog, requester, "첫 초안", BASE_PUBLISHED_AT));
        Post secondSameTimeDraft = savePost(PostFixture.draftRilogPostAt(rilog, requester, "같은 시간의 두 번째 초안", BASE_PUBLISHED_AT));
        Post latestDraft = savePost(PostFixture.draftRilogPostAt(rilog, requester, "가장 최신 초안", BASE_PUBLISHED_AT.plusMinutes(1)));

        // when
        DraftListResult result = draftService.readMyDraftList(requester.getId(), 0, 10);

        // then
        assertThat(result.drafts())
                .extracting(DraftListResult.DraftItemResult::draftId)
                .containsExactly(latestDraft.getId(), secondSameTimeDraft.getId(), firstSameTimeDraft.getId());
    }

    @Test
    @DisplayName("임시저장 첫 페이지를 크기 2로 조회하면 최신 두 건과 다음 페이지 정보를 반환한다.")
    void readMyDraftListReturnsRequestedSlice() {
        // given
        User requester = saveCompletedUser();
        Blog rilog = saveRilog(requester);
        savePost(PostFixture.draftRilogPostAt(rilog, requester, "오래된 초안", BASE_PUBLISHED_AT));
        Post middleDraft = savePost(PostFixture.draftRilogPostAt(rilog, requester, "중간 초안", BASE_PUBLISHED_AT.plusMinutes(1)));
        Post latestDraft = savePost(PostFixture.draftRilogPostAt(rilog, requester, "최신 초안", BASE_PUBLISHED_AT.plusMinutes(2)));

        // when
        DraftListResult result = draftService.readMyDraftList(requester.getId(), 0, 2);

        // then
        assertSoftly(softly -> {
            softly.assertThat(result.drafts())
                    .extracting(DraftListResult.DraftItemResult::draftId)
                    .containsExactly(latestDraft.getId(), middleDraft.getId());
            softly.assertThat(result.page()).isZero();
            softly.assertThat(result.size()).isEqualTo(2);
            softly.assertThat(result.numberOfElements()).isEqualTo(2);
            softly.assertThat(result.hasNext()).isTrue();
        });
    }

    @Test
    @DisplayName("임시저장 글이 없으면 빈 목록과 다음 페이지가 없다는 정보를 반환한다.")
    void readMyDraftListReturnsEmptySlice() {
        // given
        User requester = saveCompletedUser();

        // when
        DraftListResult result = draftService.readMyDraftList(requester.getId(), 0, 10);

        // then
        assertSoftly(softly -> {
            softly.assertThat(result.drafts()).isEmpty();
            softly.assertThat(result.numberOfElements()).isZero();
            softly.assertThat(result.hasNext()).isFalse();
        });
    }

    private User saveCompletedUser() {
        return userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("초안작성자", "draft-writer")
        );
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

    private Post savePost(Post post) {
        return postRepository.saveAndFlush(post);
    }

    private Blog saveRilog(User writer) {
        return blogRepository.saveAndFlush(Blog.createRilog(writer));
    }

}
