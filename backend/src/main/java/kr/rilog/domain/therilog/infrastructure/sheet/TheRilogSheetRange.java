package kr.rilog.domain.therilog.infrastructure.sheet;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

record TheRilogSheetRange(String tab, int firstColumn, int lastColumn, int firstRow, String lastRow) {

    private static final Pattern RANGE = Pattern.compile("(.+!)(\\$?[A-Z]+)(?:\\$?([1-9]\\d*))?:(\\$?[A-Z]+)(?:\\$?([1-9]\\d*))?");

    static TheRilogSheetRange from(String range) {
        Matcher matcher = RANGE.matcher(range);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("더 리로그 시트 범위는 탭을 포함한 A1 표기여야 합니다.");
        }
        int firstColumn = columnNumber(matcher.group(2).replace("$", ""));
        int lastColumn = columnNumber(matcher.group(4).replace("$", ""));
        int firstRow = matcher.group(3) == null ? 1 : Integer.parseInt(matcher.group(3));
        String lastRow = matcher.group(5) == null ? "" : matcher.group(5);
        if (firstColumn > lastColumn || (!lastRow.isEmpty() && firstRow > Integer.parseInt(lastRow))) {
            throw new IllegalArgumentException("더 리로그 시트 범위의 시작과 끝이 올바르지 않습니다.");
        }
        return new TheRilogSheetRange(matcher.group(1), firstColumn, lastColumn, firstRow, lastRow);
    }

    boolean hasDataRows() {
        return lastRow.isEmpty() || Integer.parseInt(lastRow) > firstRow;
    }

    String header() {
        return row(0);
    }

    String column(int relativeColumn) {
        String column = columnName(firstColumn + relativeColumn);
        return tab + column + (firstRow + 1) + ":" + column + lastRow;
    }

    String row(int relativeRow) {
        int row = firstRow + relativeRow;
        return tab + columnName(firstColumn) + row + ":" + columnName(lastColumn) + row;
    }

    String cell(int relativeRow, int relativeColumn) {
        return tab + columnName(firstColumn + relativeColumn) + (firstRow + relativeRow);
    }

    private static int columnNumber(String name) {
        int number = 0;
        for (char letter : name.toCharArray()) {
            number = number * 26 + letter - 'A' + 1;
        }
        return number;
    }

    private static String columnName(int number) {
        StringBuilder name = new StringBuilder();
        while (number > 0) {
            number--;
            name.append((char) ('A' + number % 26));
            number /= 26;
        }
        return name.reverse().toString();
    }
}
