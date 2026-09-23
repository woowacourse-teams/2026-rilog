package kr.rilog.domain.post.entity.vo;

public record TextBlockDiff(

        String blockId,
        DiffSpan equal,
        DiffSpan deleted,
        DiffSpan inserted

) {

    public int commonPrefixEndOffset() {
        return equal.endOffset();
    }

    public String updatedText() {
        return equal.text() + inserted.text();
    }

}
