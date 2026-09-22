package kr.rilog.domain.post.entity.vo;

public record TextBlockDiff(

        String blockId,
        DiffSpan equal,
        DiffSpan deleted,
        DiffSpan inserted

) {
}
