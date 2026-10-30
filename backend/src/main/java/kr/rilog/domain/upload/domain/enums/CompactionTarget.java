package kr.rilog.domain.upload.domain.enums;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

// 압축본 key를 만들어 TEMPORARY로 태깅하는 데 쓴다. 이미지 서버 COMPACT_WIDTHS(image-server/src/compact.mjs)와 같이 바꾼다.
public enum CompactionTarget {

    IMAGE("images", List.of(750, 1200, 1400, 2000)),
    PROFILE("profiles", List.of(50, 360));

    private final String directory;
    private final List<Integer> widths;

    CompactionTarget(String directory, List<Integer> widths) {
        this.directory = directory;
        this.widths = widths;
    }

    public static Optional<CompactionTarget> fromDirectory(String directory) {
        return Arrays.stream(values())
                .filter(target -> target.directory.equals(directory))
                .findFirst();
    }

    public String getDirectory() {
        return directory;
    }

    public List<Integer> getWidths() {
        return widths;
    }
}
