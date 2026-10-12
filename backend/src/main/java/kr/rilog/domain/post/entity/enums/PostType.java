package kr.rilog.domain.post.entity.enums;

public enum PostType {
    STANDARD,
    DAILY_HEADLINES,
    ENTERPRISE_SPOTLIGHT,
    PERSONAL_SPOTLIGHT;

    public boolean isSpotlight() {
        return this == ENTERPRISE_SPOTLIGHT || this == PERSONAL_SPOTLIGHT;
    }
}
