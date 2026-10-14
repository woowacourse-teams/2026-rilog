package kr.rilog.domain.therilog.service;

import java.util.List;
import kr.rilog.domain.therilog.infrastructure.sheet.GoogleSheetsClient;
import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogPublicationRow;
import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "the-rilog", name = "enabled", havingValue = "true")
public class TheRilogSheetService {

    private final GoogleSheetsClient googleSheetsClient;

    public List<TheRilogPublicationRow> readPublicationRows(boolean includeSpotlights) {
        return googleSheetsClient.readPublicationRows(includeSpotlights);
    }

    public void writePublicationResults(List<TheRilogPublishedArticle> articles) {
        googleSheetsClient.writePublicationResults(articles);
    }

}
