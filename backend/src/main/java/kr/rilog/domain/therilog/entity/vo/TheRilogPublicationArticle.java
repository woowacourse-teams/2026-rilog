package kr.rilog.domain.therilog.entity.vo;

import kr.rilog.domain.post.entity.vo.PostDetail;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;
import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;
import kr.rilog.domain.therilog.exception.TheRilogPublicationException;

import static kr.rilog.domain.therilog.exception.TheRilogPublicationErrorInformation.INVALID_THE_RILOG_PUBLICATION;

public record TheRilogPublicationArticle(
        String rowId,
        PostDetail detail,
        TheRilogPostMetadata metadata
) {

    public TheRilogPublicationArticle {
        if (rowId == null || rowId.isBlank() || detail == null || metadata == null) {
            throw new TheRilogPublicationException(INVALID_THE_RILOG_PUBLICATION);
        }
    }

    public TheRilogContentType contentType() {
        return metadata.postType().isSpotlight() ? TheRilogContentType.SPOTLIGHT : TheRilogContentType.NEWS;
    }
}
