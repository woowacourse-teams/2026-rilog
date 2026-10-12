package kr.rilog.domain.post.entity.enums;

public enum PostType {
    STANDARD,
    DAILY_HEADLINES,
    ENTERPRISE_SPOTLIGHT,
    PERSONAL_SPOTLIGHT;

    public boolean isSpotlight() {
        return this == ENTERPRISE_SPOTLIGHT || this == PERSONAL_SPOTLIGHT;
    }

    public String theRilogChapterName() {
        return switch (this) {
            case DAILY_HEADLINES -> "headlines";
            case ENTERPRISE_SPOTLIGHT, PERSONAL_SPOTLIGHT -> "spotlights";
            case STANDARD -> throw new IllegalStateException("일반 글에는 지정된 편집 챕터가 없습니다.");
        };
    }
}
