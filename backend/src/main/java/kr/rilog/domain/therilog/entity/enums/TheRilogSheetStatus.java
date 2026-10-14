package kr.rilog.domain.therilog.entity.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum TheRilogSheetStatus {

    PRODUCTION_PENDING("제작대기"),
    REVIEW_PENDING("검토대기"),
    APPROVED("승인완료"),
    PUBLISHED("발행완료");

    private final String sheetValue;

    public boolean matches(String value) {
        return sheetValue.equals(value);
    }
}
