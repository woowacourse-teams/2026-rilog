package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.therilog.infrastructure.content.TheRilogBlockNoteConverter;
import kr.rilog.domain.therilog.service.TheRilogPublicationService;
import kr.rilog.domain.therilog.service.TheRilogService;
import kr.rilog.domain.therilog.service.TheRilogSheetService;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.global.exception.RilogInfrastructureException;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.http.client.MockClientHttpRequest;
import tools.jackson.databind.json.JsonMapper;

import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static kr.rilog.global.exception.GlobalExceptionInformation.INTERNAL_SERVER_ERROR;
import static kr.rilog.domain.post.entity.enums.PostType.ENTERPRISE_SPOTLIGHT;
import static kr.rilog.domain.post.entity.enums.PostType.PERSONAL_SPOTLIGHT;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.heading;
import static kr.rilog.support.fixure.TheRilogPostFixture.publishedNews;
import static kr.rilog.support.fixure.TheRilogPostFixture.publishedSpotlight;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoogleSheetsPublicationIntegrationTest extends ServiceSupport {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final Instant NOW = Instant.parse("2026-10-13T20:00:00Z");
    private static final List<String> HEADER = List.of("rowId", "title", "content", "category", "scheduledAt", "status", "postId");
    private static final List<String> SPOTLIGHT_HEADER = List.of("rowId", "title", "content", "category", "scheduledAt", "status", "postId",
            "originalArticleUrl", "articleType", "description", "thumbnailImageUrl", "sourceProfileName", "sourceProfileImage");

    @Autowired
    private TheRilogService theRilogService;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @TempDir
    Path directory;

    private GoogleSheetsTestSupport sheets;
    private TheRilogPublicationService publicationService;
    private Chapter headlines;
    private Chapter spotlights;

    @BeforeEach
    void prepareOfficialBlogAndSheets() throws Exception {
        var owner = userRepository.saveAndFlush(UserFixture.completedWithNicknameAndSlug("공식 계정", "the_rilog"));
        var blog = blogRepository.saveAndFlush(Blog.createRilog(owner));
        headlines = chapterRepository.saveAndFlush(Chapter.create(blog, "headlines", 0));
        spotlights = chapterRepository.saveAndFlush(Chapter.create(blog, "spotlights", 1));
        sheets = new GoogleSheetsTestSupport(directory, "NEWS!A:G");
        publicationService = new TheRilogPublicationService(new TheRilogSheetService(sheets.client()),
                new TheRilogBlockNoteConverter(), theRilogService);
    }

    @Test
    @DisplayName("승인된 시트 본문을 저장한 트랜잭션이 끝난 뒤 게시글 ID와 발행완료를 시트에 기록한다.")
    void writesPublicationResultAfterDatabaseCommit() {
        String date = "2026-10-15";
        sheets.expectToken();
        sheets.expectRows("NEWS%21A%3AG", approvedNews(date));
        sheets.expectRows("SPOTLIGHTS%21A%3AM", approvedSpotlights(date));
        sheets.expectToken();
        sheets.expectRows("NEWS%21A%3AG", approvedNews(date));
        sheets.expectRows("SPOTLIGHTS%21A%3AM", approvedSpotlights(date));
        sheets.expectWrite(request -> {
            var saved = postRepository.findAll().stream().sorted(java.util.Comparator.comparing(post -> post.getId())).toList();
            var payload = MAPPER.readTree(((MockClientHttpRequest) request).getBodyAsString());
            var expectedCells = new java.util.ArrayList<GoogleSheetValuesUpdateRequest.ValueRange>();
            for (int index = 0; index < saved.size(); index++) {
                String tab = index == 0 ? "NEWS" : "SPOTLIGHTS";
                int row = index == 0 ? 2 : index + 1;
                expectedCells.add(new GoogleSheetValuesUpdateRequest.ValueRange(tab + "!G" + row,
                        List.of(List.of(saved.get(index).getId().toString()))));
                expectedCells.add(new GoogleSheetValuesUpdateRequest.ValueRange(tab + "!F" + row, List.of(List.of("발행완료"))));
            }
            assertThat(saved).hasSize(6);
            assertThat(payload).isEqualTo(MAPPER.valueToTree(new GoogleSheetValuesUpdateRequest("RAW", expectedCells)));
        });

        var published = publicationService.publishDueContent(Instant.parse("2026-10-14T20:00:00Z"));

        assertThat(published.getFirst().postId()).isEqualTo(theRilogService.readTheRilog().news().postId());
        sheets.verifyRequests();
    }

    @Test
    @DisplayName("시트 발행 결과 기록이 실패해도 이미 커밋된 게시글을 취소하지 않는다.")
    void keepsCommittedPublicationWhenSheetWriteFails() {
        expectApprovedNewsRead();
        expectPublicationWriteRead();
        sheets.expectFailedWrite();

        assertThatThrownBy(() -> publicationService.publishDueContent(NOW))
                .isInstanceOf(RilogInfrastructureException.class)
                .hasMessage(INTERNAL_SERVER_ERROR.getMessage());

        assertThat(postRepository.count()).isEqualTo(1L);
        sheets.verifyRequests();
    }

    @Test
    @DisplayName("일부 스포트라이트만 승인됐으면 해당 글을 발행하고 이전 뉴스와 스포트라이트도 최신순으로 보여준다.")
    void publishesPartialInputAndKeepsPreviousContentsInMain() {
        LocalDateTime previousTime = LocalDateTime.of(2026, 10, 12, 5, 0);
        var previousNews = postRepository.saveAndFlush(publishedNews(headlines, previousTime,
                content(heading("previous-news", 2, "이전 소식"))));
        postRepository.saveAndFlush(publishedSpotlight(spotlights, ENTERPRISE_SPOTLIGHT, previousTime.minusHours(2)));
        postRepository.saveAndFlush(publishedSpotlight(spotlights, ENTERPRISE_SPOTLIGHT, previousTime.minusHours(1)));
        var previousEnterprise = postRepository.saveAndFlush(publishedSpotlight(spotlights, ENTERPRISE_SPOTLIGHT, previousTime));
        var previousPersonal1 = postRepository.saveAndFlush(publishedSpotlight(spotlights, PERSONAL_SPOTLIGHT, previousTime.minusHours(1)));
        var previousPersonal2 = postRepository.saveAndFlush(publishedSpotlight(spotlights, PERSONAL_SPOTLIGHT, previousTime));
        String approved = approvedSpotlights("2026-10-15", 2);
        sheets.expectToken();
        sheets.expectRows("NEWS%21A%3AG", MAPPER.writeValueAsString(new GoogleSheetValuesResponse("NEWS!A1:G1", List.of(HEADER))));
        sheets.expectRows("SPOTLIGHTS%21A%3AM", approved);
        sheets.expectToken();
        sheets.expectRows("SPOTLIGHTS%21A%3AM", approved);
        sheets.expectWrite(request -> {
            var payload = MAPPER.readTree(((MockClientHttpRequest) request).getBodyAsString());
            assertThat(payload.path("data").size()).isEqualTo(4);
        });

        var published = publicationService.publishDueContent(Instant.parse("2026-10-14T20:00:00Z"));

        var main = theRilogService.readTheRilog();
        assertThat(published).hasSize(2);
        assertThat(main.news().postId()).isEqualTo(previousNews.getId());
        assertThat(main.spotlights().stream().map(article -> article.postId()).toList()).containsExactly(
                published.get(1).postId(), published.get(0).postId(), previousEnterprise.getId(),
                previousPersonal2.getId(), previousPersonal1.getId());
        sheets.verifyRequests();
    }

    private void expectApprovedNewsRead() {
        sheets.expectToken();
        sheets.expectRows("NEWS%21A%3AG", approvedNews("2026-10-14"));
    }

    private void expectPublicationWriteRead() {
        sheets.expectToken();
        sheets.expectRows("NEWS%21A%3AG", approvedNews("2026-10-14"));
    }

    private String approvedNews(String date) {
        String markdown = IntStream.range(0, 8).mapToObj(index -> "## 기사 " + index + "\n\n요약 본문")
                .collect(Collectors.joining("\n\n"));
        return MAPPER.writeValueAsString(new GoogleSheetValuesResponse("NEWS!A1:G2", List.of(HEADER,
                List.of("news_" + date, "오늘의 뉴스", markdown, "기술", date + " 05:00", "승인완료", ""))));
    }

    private String approvedSpotlights(String date) {
        return approvedSpotlights(date, 5);
    }

    private String approvedSpotlights(String date, int count) {
        var values = new java.util.ArrayList<List<String>>();
        values.add(SPOTLIGHT_HEADER);
        IntStream.range(0, count).forEach(index -> values.add(List.of("spotlight-" + index, "기술 요약 " + index,
                "## 기술 주제\n\n**핵심 설명**\n\n[원문](https://example.com/post)", "기술", date + " 05:00", "승인완료", "",
                "https://example.com/post", index < 3 ? "enterprise" : "personal", "핵심 설명", "", "출처 " + index, "")));
        return MAPPER.writeValueAsString(new GoogleSheetValuesResponse("SPOTLIGHTS!A1:M6", values));
    }
}
