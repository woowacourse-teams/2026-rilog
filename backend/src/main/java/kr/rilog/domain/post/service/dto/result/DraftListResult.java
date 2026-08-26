package kr.rilog.domain.post.service.dto.result;

import kr.rilog.domain.post.repository.projection.DraftListRow;
import org.springframework.data.domain.Slice;

import java.time.LocalDateTime;
import java.util.List;

public record DraftListResult(
        List<DraftItemResult> drafts,
        int page,
        int size,
        int numberOfElements,
        boolean hasNext
) {

    public static DraftListResult from(Slice<DraftListRow> slice) {
        return new DraftListResult(
                slice.getContent().stream()
                        .map(DraftItemResult::from)
                        .toList(),
                slice.getNumber(),
                slice.getSize(),
                slice.getNumberOfElements(),
                slice.hasNext()
        );
    }

    public record DraftItemResult(
            Long draftId,
            String title,
            LocalDateTime publishedAt
    ) {

        private static DraftItemResult from(DraftListRow row) {
            return new DraftItemResult(row.draftId(), row.title(), row.publishedAt());
        }
    }
}
