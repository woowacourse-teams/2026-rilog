package kr.rilog.domain.therilog.exception;

import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
import kr.rilog.global.exception.RilogInfrastructureException;
import lombok.Getter;

import java.util.List;
import java.util.Map;

import static kr.rilog.global.exception.GlobalExceptionInformation.INTERNAL_SERVER_ERROR;

@Getter
public class TheRilogPublicationResultWriteException extends RilogInfrastructureException {

    private final List<TheRilogPublishedArticle> publishedArticles;

    public TheRilogPublicationResultWriteException(List<TheRilogPublishedArticle> publishedArticles, Throwable cause) {
        super(INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR.getMessage(), cause,
                Map.of("operation", "write_the_rilog_publication", "articles", List.copyOf(publishedArticles)));
        this.publishedArticles = List.copyOf(publishedArticles);
    }
}
