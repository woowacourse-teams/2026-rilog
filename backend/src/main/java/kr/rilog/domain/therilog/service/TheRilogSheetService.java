package kr.rilog.domain.therilog.service;

import java.util.ArrayList;
import java.util.List;
import kr.rilog.domain.therilog.infrastructure.sheet.GoogleSheetsClient;
import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogSheetRow;
import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogPublicationRow;
import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
import kr.rilog.domain.therilog.service.dto.command.TheRilogSheetWriteCommand;
import kr.rilog.domain.therilog.service.dto.result.TheRilogProductionInput;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "the-rilog", name = "enabled", havingValue = "true")
public class TheRilogSheetService {

    private final GoogleSheetsClient googleSheetsClient;

    public List<TheRilogProductionInput> readProductionInputs() {
        List<TheRilogSheetRow> rows = googleSheetsClient.readRows();
        List<TheRilogProductionInput> inputs = new ArrayList<>();
        for (TheRilogSheetRow row : rows) {
            if (row.isProductionPending()) {
                readProductionInput(row, inputs);
            }
        }
        return List.copyOf(inputs);
    }

    public void writeProductionResult(TheRilogSheetWriteCommand command) {
        googleSheetsClient.writeProductionResult(command);
    }

    public List<TheRilogPublicationRow> readPublicationRows(boolean includeSpotlights) {
        return googleSheetsClient.readPublicationRows(includeSpotlights);
    }

    public void writePublicationResults(List<TheRilogPublishedArticle> articles) {
        googleSheetsClient.writePublicationResults(articles);
    }

    private void readProductionInput(TheRilogSheetRow row, List<TheRilogProductionInput> inputs) {
        try {
            inputs.add(row.toProductionInput());
        } catch (RuntimeException exception) {
            log.warn("더 리로그 시트의 제작 입력이 올바르지 않습니다. rowId={}", row.rowId(), exception);
        }
    }
}
