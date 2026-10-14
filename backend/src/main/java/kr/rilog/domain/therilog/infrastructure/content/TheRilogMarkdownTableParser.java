package kr.rilog.domain.therilog.infrastructure.content;

import kr.rilog.domain.post.exception.PostException;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_POST_CONTENT;

final class TheRilogMarkdownTableParser {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final Pattern DELIMITER_CELL = Pattern.compile(":?-+:?");

    private TheRilogMarkdownTableParser() {
    }

    static boolean isTableStart(String header, String delimiter) {
        if (header.isBlank() || header.startsWith("    ") || header.startsWith("\t")) {
            return false;
        }
        Row heading = readRow(header);
        Row separator = readRow(delimiter);
        return (heading.hasSeparators() || separator.hasSeparators())
                && !separator.cells().isEmpty()
                && separator.cells().stream().allMatch(cell -> DELIMITER_CELL.matcher(cell).matches());
    }

    static boolean isTableRow(String line) {
        return readRow(line).hasSeparators();
    }

    static ObjectNode parse(String header, String delimiter, List<String> body) {
        List<String> heading = readRow(header).cells();
        List<String> separators = readRow(delimiter).cells();
        if (heading.isEmpty() || heading.size() != separators.size()) {
            throw new PostException(INVALID_POST_CONTENT);
        }
        List<String> alignments = separators.stream().map(TheRilogMarkdownTableParser::alignment).toList();
        ObjectNode content = MAPPER.createObjectNode();
        content.put("type", "tableContent").put("headerRows", 1).put("headerCols", 0);
        ArrayNode widths = content.putArray("columnWidths");
        heading.forEach(ignored -> widths.addNull());
        ArrayNode rows = content.putArray("rows");
        appendRow(rows, heading, alignments);
        body.forEach(line -> appendRow(rows, readRow(line).cells(), alignments));
        return content;
    }

    private static void appendRow(ArrayNode rows, List<String> values, List<String> alignments) {
        if (values.size() > alignments.size()) {
            throw new PostException(INVALID_POST_CONTENT);
        }
        ArrayNode cells = rows.addObject().putArray("cells");
        for (int column = 0; column < alignments.size(); column++) {
            ObjectNode cell = cells.addObject();
            cell.put("type", "tableCell");
            cell.putObject("props")
                    .put("backgroundColor", "default").put("textColor", "default")
                    .put("textAlignment", alignments.get(column)).put("colspan", 1).put("rowspan", 1);
            String value = column < values.size() ? values.get(column) : "";
            cell.set("content", TheRilogMarkdownInlineParser.parse(value));
        }
    }

    private static String alignment(String delimiter) {
        if (delimiter.startsWith(":") && delimiter.endsWith(":")) {
            return "center";
        }
        return delimiter.endsWith(":") ? "right" : "left";
    }

    private static Row readRow(String source) {
        String line = source.strip();
        List<String> cells = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean hasSeparators = false;
        boolean endsWithSeparator = false;
        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);
            if (character == '\\' && index + 1 < line.length()) {
                char escaped = line.charAt(++index);
                if (escaped != '|') {
                    cell.append(character);
                }
                cell.append(escaped);
                endsWithSeparator = false;
            } else if (character == '|') {
                cells.add(cell.toString().strip());
                cell.setLength(0);
                hasSeparators = true;
                endsWithSeparator = true;
            } else {
                cell.append(character);
                endsWithSeparator = false;
            }
        }
        cells.add(cell.toString().strip());
        if (line.startsWith("|")) {
            cells.removeFirst();
        }
        if (endsWithSeparator) {
            cells.removeLast();
        }
        return new Row(List.copyOf(cells), hasSeparators);
    }

    private record Row(List<String> cells, boolean hasSeparators) {
    }
}
