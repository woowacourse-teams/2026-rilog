package kr.rilog.domain.post.service;

import kr.rilog.domain.post.repository.projection.DraftListRow;
import kr.rilog.domain.post.service.dto.result.DraftDetailResult;
import kr.rilog.domain.post.service.dto.result.DraftListResult;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;
import java.util.List;
import static kr.rilog.domain.post.exception.PostErrorInformation.NOT_POST_AUTHOR;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static kr.rilog.domain.post.exception.PostErrorInformation.DRAFT_NOT_FOUND;
import static kr.rilog.support.fixure.BlogFixture.createRilog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.imageBlock;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DraftQueryServiceTest {

    private static final Long DRAFT_ID = 1L;
    private static final Long WRITER_ID = 1L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 27, 12, 0);

    @Mock
    private PostRepository postRepository;

    private DraftQueryService draftQueryService;

    @BeforeEach
    void setUp() {
        draftQueryService = new DraftQueryService(postRepository);
    }

    @Test
    @DisplayName("존재하지 않는 초안을 조회하면 초안을 찾을 수 없다는 예외가 발생한다.")
    void getMyDraftRejectsMissingDraft() {
        // given
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> draftQueryService.getMyDraft(DRAFT_ID, WRITER_ID));

        // then
        assertThat(thrown)
                .isInstanceOf(PostException.class)
                .hasMessage(DRAFT_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("초안 목록의 행과 페이지 정보를 응답에 매핑한다.")
    void readMyDraftListMapsSlice() {
        // given
        PageRequest page = PageRequest.of(1, 2);
        DraftListRow row = new DraftListRow(DRAFT_ID, "초안", NOW);
        when(postRepository.findDraftsByWriterId(WRITER_ID, PostStatus.DRAFT, page))
                .thenReturn(new SliceImpl<>(List.of(row), page, true));

        // when
        DraftListResult result = draftQueryService.readMyDraftList(WRITER_ID, 1, 2);

        // then
        assertThat(result).isEqualTo(new DraftListResult(
                List.of(new DraftListResult.DraftItemResult(DRAFT_ID, "초안", NOW)), 1, 2, 1, true
        ));
    }

    @Test
    @DisplayName("초안이 없으면 요청 페이지 정보와 빈 목록을 반환한다.")
    void readMyDraftListReturnsEmptySlice() {
        // given
        PageRequest page = PageRequest.of(1, 10);
        when(postRepository.findDraftsByWriterId(WRITER_ID, PostStatus.DRAFT, page))
                .thenReturn(new SliceImpl<>(List.of(), page, false));

        // when
        DraftListResult result = draftQueryService.readMyDraftList(WRITER_ID, 1, 10);

        // then
        assertThat(result).isEqualTo(new DraftListResult(List.of(), 1, 10, 0, false));
    }

    @Test
    @DisplayName("초안 상세를 저장된 제목, 본문, 상태, 임시저장 시각으로 매핑한다.")
    void getMyDraftMapsStoredDetail() {
        // given
        String imageUrl = "https://example.com/image.png";
        Post draft = draftWithImage(imageUrl);
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.of(draft));

        // when
        DraftDetailResult result = draftQueryService.getMyDraft(DRAFT_ID, WRITER_ID);

        // then
        assertThat(result).isEqualTo(new DraftDetailResult(
                DRAFT_ID, "초안", content(imageBlock(imageUrl)).getContent(), PostStatus.DRAFT, NOW
        ));
    }

    @Test
    @DisplayName("다른 작성자의 초안 상세를 조회하면 작성 권한 예외를 반환한다.")
    void getMyDraftRejectsOtherWriter() {
        // given
        Post draft = draftWithImage("https://example.com/image.png");
        when(postRepository.findDraftById(DRAFT_ID)).thenReturn(Optional.of(draft));

        // when & then
        assertThatThrownBy(() -> draftQueryService.getMyDraft(DRAFT_ID, 99L))
                .isInstanceOf(PostException.class)
                .hasMessage(NOT_POST_AUTHOR.getMessage());
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
