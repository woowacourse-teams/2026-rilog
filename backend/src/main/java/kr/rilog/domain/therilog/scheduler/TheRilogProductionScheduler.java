package kr.rilog.domain.therilog.scheduler;

import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogSheetProperties;
import kr.rilog.domain.therilog.service.TheRilogSheetService;
import kr.rilog.domain.therilog.service.dto.result.TheRilogProductionInput;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "the-rilog", name = "enabled", havingValue = "true")
public class TheRilogProductionScheduler {

    private final TheRilogSheetService sheetService;
    private final TheRilogSheetProperties properties;

    @Scheduled(cron = "${the-rilog.production-cron}", zone = "Asia/Seoul")
    public void readProductionInputs() {
        try {
            List<TheRilogProductionInput> inputs = sheetService.readProductionInputs();
            log.info("더 리로그 제작대기 입력을 조회했습니다. spreadsheetId={}, inputCount={}",
                    properties.spreadsheetId(), inputs.size());
        } catch (RuntimeException exception) {
            log.warn("더 리로그 제작 입력 시트 읽기에 실패했습니다. spreadsheetId={}", properties.spreadsheetId(), exception);
        }
    }
}
