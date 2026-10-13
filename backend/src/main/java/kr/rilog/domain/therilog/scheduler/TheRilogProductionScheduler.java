package kr.rilog.domain.therilog.scheduler;

import kr.rilog.domain.therilog.infrastructure.sheet.GoogleSheetsClient;
import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogSheetProperties;
import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogSheetRow;
import kr.rilog.domain.therilog.service.TheRilogSheetImportService;
import kr.rilog.domain.therilog.service.dto.command.TheRilogTaskImportCommand;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "the-rilog", name = "enabled", havingValue = "true")
public class TheRilogProductionScheduler {

    private final GoogleSheetsClient googleSheetsClient;
    private final TheRilogSheetImportService importService;
    private final TheRilogSheetProperties properties;

    @Scheduled(cron = "${the-rilog.production-cron}", zone = "Asia/Seoul")
    public void prepareNextEdition() {
        List<TheRilogSheetRow> rows;
        try {
            rows = googleSheetsClient.readRows();
        } catch (RuntimeException exception) {
            log.warn("더 리로그 제작 입력 시트 읽기에 실패했습니다. spreadsheetId={}", properties.spreadsheetId(), exception);
            return;
        }

        Set<String> collectedRowIds = importService.readCollectedRowIds(properties.spreadsheetId());
        rows.stream()
                .filter(row -> !collectedRowIds.contains(row.rowId()))
                .filter(TheRilogSheetRow::isProductionPendingSpotlight)
                .forEach(this::importRow);
    }

    private void importRow(TheRilogSheetRow row) {
        try {
            TheRilogTaskImportCommand command = row.toImportCommand(properties.spreadsheetId());
            importService.importRequest(command);
        } catch (RuntimeException exception) {
            log.warn("더 리로그 제작 입력 수집에 실패했습니다. spreadsheetId={}, rowId={}",
                    properties.spreadsheetId(), row.rowId(), exception);
        }
    }
}
