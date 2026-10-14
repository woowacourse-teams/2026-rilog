package kr.rilog.domain.therilog.entity.vo;

import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostContent;
import kr.rilog.domain.therilog.exception.TheRilogPublicationException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

import static kr.rilog.domain.therilog.exception.TheRilogPublicationErrorInformation.INVALID_THE_RILOG_PUBLICATION;

public record TheRilogPublication(LocalDate date, List<TheRilogPublicationArticle> articles) {

    public TheRilogPublication {
        if (date == null || articles == null || articles.stream().anyMatch(article -> article == null)) {
            throw new TheRilogPublicationException(INVALID_THE_RILOG_PUBLICATION);
        }
        articles = List.copyOf(articles);
        validateUniqueRows(articles);
    }

    public static TheRilogPublication of(LocalDate date, List<TheRilogPublicationArticle> articles) {
        return new TheRilogPublication(date, articles);
    }

    public static boolean isSpotlightDay(LocalDate date) {
        return date.getDayOfWeek() == DayOfWeek.MONDAY || date.getDayOfWeek() == DayOfWeek.THURSDAY;
    }

    public boolean hasRecommendedCounts() {
        int enterpriseCount = isSpotlightDay(date) ? 3 : 0;
        int personalCount = isSpotlightDay(date) ? 2 : 0;
        return count(articles, PostType.DAILY_HEADLINES) == 1
                && count(articles, PostType.ENTERPRISE_SPOTLIGHT) == enterpriseCount
                && count(articles, PostType.PERSONAL_SPOTLIGHT) == personalCount
                && articles.stream()
                .filter(article -> article.metadata().postType() == PostType.DAILY_HEADLINES)
                .allMatch(article -> PostContent.from(article.detail().content()).extractHeadingBlocks().stream()
                        .filter(heading -> !heading.text().isBlank()).count() == 8);
    }

    private static void validateUniqueRows(List<TheRilogPublicationArticle> articles) {
        long uniqueRows = articles.stream().map(article -> article.contentType() + ":" + article.rowId()).distinct().count();
        if (uniqueRows != articles.size()) {
            throw new TheRilogPublicationException(INVALID_THE_RILOG_PUBLICATION);
        }
    }

    private static long count(List<TheRilogPublicationArticle> articles, PostType type) {
        return articles.stream().filter(article -> article.metadata().postType() == type).count();
    }
}
