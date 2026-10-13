package kr.rilog.domain.therilog.infrastructure.sheet;

import java.util.List;

record GoogleSheetValuesResponse(
        List<List<String>> values
) {
}
