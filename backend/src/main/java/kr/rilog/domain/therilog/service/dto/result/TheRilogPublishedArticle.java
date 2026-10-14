package kr.rilog.domain.therilog.service.dto.result;

import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;

public record TheRilogPublishedArticle(String rowId, TheRilogContentType contentType, Long postId) {
}
