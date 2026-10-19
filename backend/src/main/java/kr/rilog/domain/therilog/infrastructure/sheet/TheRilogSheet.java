package kr.rilog.domain.therilog.infrastructure.sheet;

import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;
import kr.rilog.domain.therilog.exception.TheRilogSheetException;
import kr.rilog.domain.therilog.infrastructure.sheet.TheRilogPublicationRow.Spotlight;
import kr.rilog.domain.therilog.service.dto.result.TheRilogPublishedArticle;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static kr.rilog.domain.therilog.entity.enums.TheRilogContentType.SPOTLIGHT;
import static kr.rilog.domain.therilog.entity.enums.TheRilogSheetStatus.APPROVED;
import static kr.rilog.domain.therilog.entity.enums.TheRilogSheetStatus.PUBLISHED;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.DUPLICATE_THE_RILOG_SHEET_ROW_ID;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_SHEET_INPUT;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.INVALID_THE_RILOG_PUBLICATION_STATUS;
import static kr.rilog.domain.therilog.exception.TheRilogSheetErrorInformation.THE_RILOG_SHEET_ROW_NOT_FOUND;

final class TheRilogSheet {

    private static final List<String> INDEX_COLUMNS = List.of("rowId", "status", "postId");

    private final TheRilogContentType contentType;
    private final String range;
    private final List<List<String>> values;
    private final Map<String, Integer> columns;

    TheRilogSheet(TheRilogContentType contentType, String requestedRange, GoogleSheetValuesResponse response) {
        this.contentType = contentType;
        this.range = requestedRange;
        this.values = response == null || response.values() == null ? List.of() : response.values();
        this.columns = values.isEmpty() ? Map.of() : readColumns(values.getFirst());
    }

    List<String> indexRanges() {
        validateInputColumns();
        getColumn("title");
        getColumn("content");
        getColumn("postId");
        TheRilogSheetRange coordinates = TheRilogSheetRange.from(range);
        return INDEX_COLUMNS.stream().map(name -> coordinates.column(getColumn(name))).toList();
    }

    TheRilogSheet withIndex(GoogleSheetBatchValuesResponse response) {
        List<GoogleSheetValuesResponse> ranges = requireRanges(response, INDEX_COLUMNS.size());
        int rowCount = ranges.stream().mapToInt(value -> value.values() == null ? 0 : value.values().size()).max().orElse(0);
        List<List<String>> indexedValues = new ArrayList<>();
        indexedValues.add(values.getFirst());
        for (int row = 0; row < rowCount; row++) {
            List<String> cells = new ArrayList<>(Collections.nCopies(values.getFirst().size(), ""));
            for (int column = 0; column < INDEX_COLUMNS.size(); column++) {
                List<List<String>> columnValues = ranges.get(column).values();
                if (columnValues != null && row < columnValues.size() && !columnValues.get(row).isEmpty()) {
                    cells.set(getColumn(INDEX_COLUMNS.get(column)), columnValues.get(row).getFirst());
                }
            }
            indexedValues.add(cells);
        }
        TheRilogSheet index = new TheRilogSheet(contentType, range, new GoogleSheetValuesResponse(range, indexedValues));
        index.validateUniqueRowIds();
        return index;
    }

    List<SelectedRow> selectedRows() {
        TheRilogSheetRange coordinates = TheRilogSheetRange.from(range);
        List<SelectedRow> selected = new ArrayList<>();
        for (int index = 1; index < values.size(); index++) {
            List<String> row = values.get(index);
            if (isApprovedUnpublished(row)) {
                selected.add(new SelectedRow(cell(row, "rowId"), coordinates.row(index)));
            }
        }
        return List.copyOf(selected);
    }

    List<TheRilogPublicationRow> readSelectedRows(List<SelectedRow> selected, GoogleSheetBatchValuesResponse response) {
        List<GoogleSheetValuesResponse> ranges = requireRanges(response, selected.size());
        List<TheRilogPublicationRow> rows = new ArrayList<>();
        for (int index = 0; index < selected.size(); index++) {
            List<List<String>> returnedRows = ranges.get(index).values();
            if (returnedRows == null || returnedRows.size() != 1
                    || !selected.get(index).rowId().equals(cell(returnedRows.getFirst(), "rowId"))) {
                throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_INPUT);
            }
            List<String> row = returnedRows.getFirst();
            if (isApprovedUnpublished(row)) {
                rows.add(readPublicationRow(row));
            }
        }
        return List.copyOf(rows);
    }

    boolean isEmpty() {
        return values.isEmpty();
    }

    private List<GoogleSheetValuesResponse> requireRanges(GoogleSheetBatchValuesResponse response, int count) {
        if (response == null || response.valueRanges() == null || response.valueRanges().size() != count) {
            throw new TheRilogSheetException(INVALID_THE_RILOG_SHEET_INPUT);
        }
        return response.valueRanges();
    }

    private void validateUniqueRowIds() {
        Set<String> ids = new HashSet<>();
        for (List<String> row : values.subList(1, values.size())) {
            String rowId = cell(row, "rowId");
            if (StringUtils.hasText(rowId) && !ids.add(rowId)) {
                throw new TheRilogSheetException(DUPLICATE_THE_RILOG_SHEET_ROW_ID);
            }
        }
    }

    private boolean isApprovedUnpublished(List<String> row) {
        return APPROVED.matches(cell(row, "status")) && !StringUtils.hasText(cell(row, "postId"));
    }

    private TheRilogPublicationRow readPublicationRow(List<String> row) {
        return new TheRilogPublicationRow(toRow(row), cell(row, "title"), cell(row, "content"),
                readSpotlight(row), cell(row, "postId"));
    }

    record SelectedRow(String rowId, String range) {
    }

    List<TheRilogPublicationRow> readPublicationRows() {
        if (values.isEmpty()) {
            return List.of();
        }
        validateInputColumns();
        getColumn("title");
        getColumn("content");
        getColumn("postId");
        return values.stream().skip(1).map(this::readPublicationRow).toList();
    }

    List<GoogleSheetValuesUpdateRequest.ValueRange> createPublicationUpdates(TheRilogPublishedArticle article) {
        validateInputColumns();
        int rowIndex = getUniqueRowIndex(article.rowId());
        List<String> row = values.get(rowIndex);
        if (PUBLISHED.matches(cell(row, "status")) && article.postId().toString().equals(cell(row, "postId"))) {
            return List.of();
        }
        if (!isApprovedUnpublished(row)) {
            throw new TheRilogSheetException(INVALID_THE_RILOG_PUBLICATION_STATUS);
        }
        Map<String, String> result = new LinkedHashMap<>();
        result.put("postId", article.postId().toString());
        result.put("status", PUBLISHED.getSheetValue());
        return createUpdates(rowIndex, result);
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

    private Spotlight readSpotlight(List<String> row) {
        if (contentType != SPOTLIGHT) {
            return null;
        }
        return new Spotlight(cell(row, "articleType"), cell(row, "description"),
                cell(row, "thumbnailImageUrl"), cell(row, "sourceProfileName"), cell(row, "sourceProfileImage"));
    }

    private String cellRange(int rowIndex, int columnIndex) {
        return TheRilogSheetRange.from(range).cell(rowIndex, columnIndex);
    }

}
