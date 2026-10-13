package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;
import kr.rilog.domain.therilog.exception.TheRilogSheetException;
import kr.rilog.domain.therilog.service.dto.command.TheRilogSheetWriteCommand;
import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static kr.rilog.domain.therilog.entity.enums.TheRilogContentType.SPOTLIGHT;
import static kr.rilog.domain.therilog.entity.enums.TheRilogSheetStatus.APPROVED;
import static kr.rilog.domain.therilog.entity.enums.TheRilogSheetStatus.PUBLISHED;
import static kr.rilog.domain.therilog.entity.enums.TheRilogSheetStatus.REVIEW_PENDING;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.DUPLICATE_THE_RILOG_SHEET_ROW_ID;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_INPUT;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_RESULT;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_STATUS;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_PUBLICATION_STATUS;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.THE_RILOG_SHEET_ROW_NOT_FOUND;

final class TheRilogSheet {

    private static final Pattern FIRST_CELL = Pattern.compile("\\$?([A-Z]+)\\$?([1-9]\\d*)?");

    private final TheRilogContentType contentType;
    private final String range;
    private final List<List<String>> values;
    private final Map<String, Integer> columns;

    TheRilogSheet(TheRilogContentType contentType, String requestedRange, GoogleSheetValuesResponse response) {
        this.contentType = contentType;
        this.range = response != null && StringUtils.hasText(response.range()) ? response.range() : requestedRange;
        this.values = response == null || response.values() == null ? List.of() : response.values();
        this.columns = values.isEmpty() ? Map.of() : readColumns(values.getFirst());
    }

    List<TheRilogSheetRow> readRows() {
        if (values.isEmpty()) {
            return List.of();
        }
        validateInputColumns();
        return values.stream().skip(1).map(this::toRow).toList();
    }

    List<TheRilogPublicationRow> readPublicationRows() {
        if (values.isEmpty()) {
            return List.of();
        }
        validateInputColumns();
        getColumn("title");
        getColumn("content");
        getColumn("postId");
        return values.stream().skip(1).map(row -> new TheRilogPublicationRow(toRow(row),
                cell(row, "title"), cell(row, "content"), readSpotlight(row), cell(row, "postId"))).toList();
    }

    List<GoogleSheetValuesUpdateRequest.ValueRange> createPublicationUpdates(TheRilogPublishedArticle article) {
        validateInputColumns();
        int rowIndex = getUniqueRowIndex(article.rowId());
        List<String> row = values.get(rowIndex);
        if (!APPROVED.matches(cell(row, "status")) || StringUtils.hasText(cell(row, "postId"))) {
            throw new TheRilogSheetException(INVALID_THE_RILOG_PUBLICATION_STATUS);
        }
        Map<String, String> result = new LinkedHashMap<>();
        result.put("postId", article.postId().toString());
        result.put("status", PUBLISHED.getSheetValue());
        return createUpdates(rowIndex, result);
    }

    GoogleSheetValuesUpdateRequest createWriteRequest(TheRilogSheetWriteCommand command) {
        validateInputColumns();
        int rowIndex = getUniqueRowIndex(command.rowId());
        if (!toRow(values.get(rowIndex)).isProductionPending()) {
            throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_STATUS);
        }
        Map<String, String> result = resultCells(command);
        return new GoogleSheetValuesUpdateRequest("RAW", createUpdates(rowIndex, result));
    }

    private List<GoogleSheetValuesUpdateRequest.ValueRange> createUpdates(int rowIndex, Map<String, String> result) {
        List<GoogleSheetValuesUpdateRequest.ValueRange> updates = new ArrayList<>();
        for (Map.Entry<String, String> entry : result.entrySet()) {
            int columnIndex = getColumn(entry.getKey());
            updates.add(new GoogleSheetValuesUpdateRequest.ValueRange(
                    cellRange(rowIndex, columnIndex), List.of(List.of(entry.getValue()))));
        }
        return List.copyOf(updates);
    }

    private int getUniqueRowIndex(String rowId) {
        if (!StringUtils.hasText(rowId)) {
            throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_INPUT);
        }
        int found = -1;
        for (int index = 1; index < values.size(); index++) {
            if (rowId.equals(cell(values.get(index), "rowId"))) {
                if (found != -1) {
                    throw new TheRilogSheetException(DUPLICATE_THE_RILOG_SHEET_ROW_ID);
                }
                found = index;
            }
        }
        if (found == -1) {
            throw new TheRilogSheetException(THE_RILOG_SHEET_ROW_NOT_FOUND);
        }
        return found;
    }

    private void validateInputColumns() {
        getColumn("rowId");
        getColumn("category");
        getColumn("scheduledAt");
        getColumn("status");
        if (contentType == SPOTLIGHT) {
            getColumn("originalArticleUrl");
        }
    }

    private Map<String, Integer> readColumns(List<String> header) {
        Map<String, Integer> columns = new LinkedHashMap<>();
        for (int index = 0; index < header.size(); index++) {
            String name = header.get(index);
            if (StringUtils.hasText(name) && columns.putIfAbsent(name, index) != null) {
                throw new IllegalArgumentException("더 리로그 시트 헤더가 중복됩니다: " + name);
            }
        }
        return columns;
    }

    private int getColumn(String name) {
        Integer index = columns.get(name);
        if (index == null) {
            throw new IllegalArgumentException("더 리로그 시트 필수 헤더가 없습니다: " + name);
        }
        return index;
    }

    private String cell(List<String> row, String name) {
        int index = getColumn(name);
        return index < row.size() ? row.get(index) : "";
    }

    private TheRilogSheetRow toRow(List<String> row) {
        return new TheRilogSheetRow(
                cell(row, "rowId"), contentType.name(),
                contentType == SPOTLIGHT ? cell(row, "originalArticleUrl") : "",
                cell(row, "category"), cell(row, "scheduledAt"), cell(row, "status"));
    }

    private TheRilogSheetWriteCommand.Spotlight readSpotlight(List<String> row) {
        if (contentType != SPOTLIGHT) {
            return null;
        }
        return new TheRilogSheetWriteCommand.Spotlight(cell(row, "articleType"), cell(row, "description"),
                cell(row, "thumbnailImageUrl"), cell(row, "sourceProfileName"), cell(row, "sourceProfileImage"));
    }

    private Map<String, String> resultCells(TheRilogSheetWriteCommand command) {
        if (!StringUtils.hasText(command.title()) || !StringUtils.hasText(command.content())) {
            throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_RESULT);
        }
        Map<String, String> result = new LinkedHashMap<>();
        result.put("title", command.title());
        result.put("content", command.content());
        if (contentType == SPOTLIGHT) {
            TheRilogSheetWriteCommand.Spotlight spotlight = command.spotlight();
            if (spotlight == null || (!"enterprise".equals(spotlight.articleType())
                    && !"personal".equals(spotlight.articleType()))) {
                throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_RESULT);
            }
            result.put("articleType", spotlight.articleType());
            result.put("description", emptyIfNull(spotlight.description()));
            result.put("thumbnailImageUrl", emptyIfNull(spotlight.thumbnailImageUrl()));
            result.put("sourceProfileName", emptyIfNull(spotlight.sourceProfileName()));
            result.put("sourceProfileImage", emptyIfNull(spotlight.sourceProfileImage()));
        }
        result.put("status", REVIEW_PENDING.getSheetValue());
        return result;
    }

    private String cellRange(int rowIndex, int columnIndex) {
        int separator = range.lastIndexOf('!');
        if (separator == -1) {
            throw new IllegalArgumentException("더 리로그 시트 범위는 탭을 포함한 A1 표기여야 합니다.");
        }
        String firstCell = range.substring(separator + 1).split(":")[0];
        Matcher matcher = FIRST_CELL.matcher(firstCell);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("더 리로그 시트 범위의 시작 셀을 해석할 수 없습니다.");
        }
        int firstColumn = columnNumber(matcher.group(1));
        int firstRow = matcher.group(2) == null ? 1 : Integer.parseInt(matcher.group(2));
        return range.substring(0, separator + 1) + columnName(firstColumn + columnIndex) + (firstRow + rowIndex);
    }

    private int columnNumber(String name) {
        int number = 0;
        for (char letter : name.toCharArray()) {
            number = number * 26 + letter - 'A' + 1;
        }
        return number;
    }

    private String columnName(int number) {
        StringBuilder name = new StringBuilder();
        while (number > 0) {
            number--;
            name.append((char) ('A' + number % 26));
            number /= 26;
        }
        return name.reverse().toString();
    }

    private String emptyIfNull(String value) {
        return value == null ? "" : value;
    }
}
