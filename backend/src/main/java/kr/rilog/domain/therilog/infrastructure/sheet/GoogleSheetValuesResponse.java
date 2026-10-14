package kr.rilog.domain.therilog.infrastructure.sheet;

import java.util.List;

record GoogleSheetValuesResponse(
        String range,
        List<List<String>> values
) {
}
