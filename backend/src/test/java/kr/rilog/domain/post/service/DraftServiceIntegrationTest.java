package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.post.service.dto.result.DraftIdResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_NOT_FOUND;
import static kr.rilog.domain.post.entity.enums.PostStatus.DRAFT;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PRIVATE;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static kr.rilog.support.fixure.PostFixture.initialDraftSaveCommand;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class DraftServiceIntegrationTest extends ServiceSupport {

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

    private User saveCompletedUser() {
        return userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("초안작성자", "draft-writer")
        );
    }

    private Blog saveRilog(User writer) {
        return blogRepository.saveAndFlush(Blog.createRilog(writer));
    }

}
