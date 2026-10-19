package kr.rilog.domain.therilog.infrastructure.sheet;

import java.util.List;

record GoogleSheetBatchValuesResponse(List<GoogleSheetValuesResponse> valueRanges) {
}
