package kr.rilog.domain.therilog.infrastructure.sheet;

import java.util.List;

record GoogleSheetValuesUpdateRequest(
        String valueInputOption,
        List<ValueRange> data
) {

    record ValueRange(String range, List<List<String>> values) {
    }
}
