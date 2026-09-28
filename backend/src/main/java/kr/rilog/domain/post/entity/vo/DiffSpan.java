package kr.rilog.domain.post.entity.vo;

public record DiffSpan(
        int startOffset,
        int endOffset,
        String text
) {

    public DiffSpan {
        if (text == null) {
            throw new IllegalArgumentException("DiffSpan의 text가 null입니다.");
        }

        if (startOffset < 0 || startOffset > endOffset || text.length() != endOffset - startOffset) {
            throw new IllegalArgumentException("잘못된 diff 범위입니다.");
        }
    }

    public static DiffSpan slice(String source, int start, int end) {
        return new DiffSpan(start, end, source.substring(start, end));
    }

}
