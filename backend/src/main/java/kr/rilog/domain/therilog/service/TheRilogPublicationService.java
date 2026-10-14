package kr.rilog.domain.therilog.service;

import kr.rilog.domain.therilog.entity.vo.TheRilogPublication;
import kr.rilog.domain.therilog.infrastructure.content.TheRilogBlockNoteConverter;
import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "the-rilog", name = "enabled", havingValue = "true")
public class TheRilogPublicationService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final TheRilogSheetService sheetService;
    private final TheRilogBlockNoteConverter converter;
    private final TheRilogService theRilogService;

    public List<TheRilogPublishedArticle> publishDueContent(Instant now) {
        LocalDate date = now.atZone(SEOUL).toLocalDate();
        var rows = sheetService.readPublicationRows(TheRilogPublication.isSpotlightDay(date)).stream()
                .filter(row -> row.isDue(now))
                .sorted(Comparator.comparing(row -> row.input().parseScheduledAt()))
                .toList();
        if (rows.isEmpty()) {
            return List.of();
        }
        var articles = rows.stream().map(row -> row.toArticle(converter.convert(row.content()))).toList();
        TheRilogPublication publication = TheRilogPublication.of(date, articles);
        warnIfCountsDiffer(publication);
        List<TheRilogPublishedArticle> published = theRilogService.publishPublication(publication);
        log.info("더 리로그 발행분의 DB 저장을 완료했습니다. date={}, articles={}", date, published);
        writePublishedResults(date, published);
        return published;
    }

    private void warnIfCountsDiffer(TheRilogPublication publication) {
        if (!publication.hasRecommendedCounts()) {
            log.warn("더 리로그 게시글 또는 뉴스 기사 개수가 권장 개수와 다릅니다. 승인된 콘텐츠의 발행은 계속합니다. date={}, rowIds={}",
                    publication.date(), publication.articles().stream().map(article -> article.rowId()).toList());
        }
    }

    private void writePublishedResults(LocalDate date, List<TheRilogPublishedArticle> published) {
        try {
            sheetService.writePublicationResults(published);
        } catch (RuntimeException exception) {
            log.error("더 리로그 게시글은 저장됐지만 시트 발행 결과 기록에 실패했습니다. 시트를 수동으로 맞춰주세요. date={}, articles={}",
                    date, published, exception);
            throw exception;
        }
    }
}
