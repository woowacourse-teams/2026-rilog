package kr.rilog.domain.therilog.entity.vo;

import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;
import kr.rilog.domain.therilog.exception.TheRilogPublicationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

import static kr.rilog.domain.post.entity.enums.Category.TECH;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;
import static kr.rilog.domain.therilog.exception.TheRilogPublicationErrorInformation.INVALID_THE_RILOG_PUBLICATION;
import static kr.rilog.support.fixure.PostContentFixture.content;
import static kr.rilog.support.fixure.PostContentFixture.heading;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TheRilogPublicationTest {

    @ParameterizedTest
    @ValueSource(strings = {"2026-10-12", "2026-10-15"})
    @DisplayName("월요일과 목요일의 뉴스와 기업 세 개 및 개인 두 개는 권장 개수에 맞는다.")
    void createsCompleteSpotlightEdition(String date) {
        List<TheRilogPublicationArticle> articles = thursdayArticles();

        TheRilogPublication publication = TheRilogPublication.of(LocalDate.parse(date), articles);

        assertThat(publication.hasRecommendedCounts()).isTrue();
    }

    @Test
    @DisplayName("스포트라이트가 부족해도 발행분을 만들고 권장 개수와 다름을 표시한다.")
    void acceptsIncompleteSpotlightEdition() {
        List<TheRilogPublicationArticle> articles = thursdayArticles();
        articles.removeLast();

        var publication = TheRilogPublication.of(LocalDate.of(2026, 10, 15), articles);

        assertThat(publication.hasRecommendedCounts()).isFalse();
    }

    @Test
    @DisplayName("스포트라이트 발행일이 아니면 뉴스 게시글 한 개로 발행분을 만든다.")
    void createsNewsOnlyEditionOnOtherDays() {
        var news = news(8);

        TheRilogPublication publication = TheRilogPublication.of(LocalDate.of(2026, 10, 14), List.of(news));

        assertThat(publication.hasRecommendedCounts()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(ints = {7, 9})
    @DisplayName("뉴스 기사가 여덟 개가 아니어도 발행분을 만들고 권장 개수와 다름을 표시한다.")
    void acceptsNewsWithoutEightArticles(int count) {
        var publication = TheRilogPublication.of(LocalDate.of(2026, 10, 14), List.of(news(count)));

        assertThat(publication.hasRecommendedCounts()).isFalse();
    }

    @Test
    @DisplayName("뉴스가 없어도 승인된 스포트라이트만으로 발행분을 만든다.")
    void acceptsSpotlightsWithoutNews() {
        var publication = TheRilogPublication.of(LocalDate.of(2026, 10, 15),
                List.of(spotlight("enterprise", PostType.ENTERPRISE_SPOTLIGHT)));

        assertThat(publication.hasRecommendedCounts()).isFalse();
    }

    @Test
    @DisplayName("같은 시트 행이 중복되면 중복 발행을 막기 위해 발행분을 만들지 않는다.")
    void rejectsDuplicateRows() {
        var article = spotlight("enterprise", PostType.ENTERPRISE_SPOTLIGHT);

        assertThatThrownBy(() -> TheRilogPublication.of(LocalDate.of(2026, 10, 15), List.of(article, article)))
                .isInstanceOf(TheRilogPublicationException.class)
                .hasMessage(INVALID_THE_RILOG_PUBLICATION.getMessage());
    }

    private List<TheRilogPublicationArticle> thursdayArticles() {
        List<TheRilogPublicationArticle> articles = new ArrayList<>();
        articles.add(news(8));
        IntStream.range(0, 3).forEach(index -> articles.add(spotlight("enterprise-" + index, PostType.ENTERPRISE_SPOTLIGHT)));
        IntStream.range(0, 2).forEach(index -> articles.add(spotlight("personal-" + index, PostType.PERSONAL_SPOTLIGHT)));
        return articles;
    }

    private TheRilogPublicationArticle news(int headings) {
        String[] blocks = IntStream.range(0, headings).mapToObj(index -> heading("news-" + index, 2, "기사 " + index)).toArray(String[]::new);
        return new TheRilogPublicationArticle("news", new PostDetail("오늘의 뉴스", content(blocks).getContent(), TECH, PUBLIC, null),
                new TheRilogPostMetadata(PostType.DAILY_HEADLINES, null, null, null));
    }

    private TheRilogPublicationArticle spotlight(String rowId, PostType type) {
        return new TheRilogPublicationArticle(rowId, new PostDetail("기술 요약", content(heading("body", 2, "본문")).getContent(), TECH, PUBLIC, null),
                new TheRilogPostMetadata(type, "핵심 요약", "출처", null));
    }
}
