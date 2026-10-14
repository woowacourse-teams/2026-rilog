package kr.rilog.domain.therilog.infrastructure.content;

import kr.rilog.domain.post.exception.PostException;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.net.URI;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_POST_CONTENT;

final class TheRilogMarkdownInlineParser {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final Set<String> LINK_SCHEMES = Set.of("http", "https", "mailto");
    private static final String ESCAPABLE = "\\`*_{}[]()#+-.!<>|~";
    private static final Pattern HTML = Pattern.compile(
            "</?[A-Za-z][A-Za-z0-9-]*"
                    + "(?:\\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s\"'=<>`]+))?)*"
                    + "\\s*/?>|<!--|<\\?|<![A-Za-z]|<!\\[CDATA\\[");

    private final String source;
    private int cursor;

    private TheRilogMarkdownInlineParser(String source) {
        this.source = source;
    }

    static ArrayNode parse(String source) {
        return new TheRilogMarkdownInlineParser(source).read(MAPPER.createObjectNode(), null, true);
    }

    private ArrayNode read(ObjectNode styles, String closing, boolean allowLinks) {
        ArrayNode content = MAPPER.createArrayNode();
        StringBuilder plain = new StringBuilder();
        while (cursor < source.length()) {
            if (closing != null && closesEmphasis(closing, styles)) {
                cursor += closing.length();
                appendText(content, plain, styles);
                return content;
            }
            char current = source.charAt(cursor);
            if (current == '\\' && cursor + 1 < source.length()
                    && ESCAPABLE.indexOf(source.charAt(cursor + 1)) >= 0) {
                plain.append(source.charAt(cursor + 1));
                cursor += 2;
                continue;
            }
            if (source.startsWith("![", cursor) || (current == '<' && isHtmlAtCursor()) || source.startsWith("~~", cursor)) {
                throw new PostException(INVALID_POST_CONTENT);
            }
            if (current == '[' && allowLinks && readLink(content, plain, styles)) {
                continue;
            }
            if (current == '`' && readCode(content, plain, styles)) {
                continue;
            }
            String delimiter = delimiterAtCursor();
            if (delimiter != null && hasClosing(delimiter)) {
                appendText(content, plain, styles);
                cursor += delimiter.length();
                ObjectNode emphasized = styles.deepCopy();
                if (delimiter.length() >= 2) {
                    emphasized.put("bold", true);
                }
                if (delimiter.length() == 1 || delimiter.length() == 3) {
                    emphasized.put("italic", true);
                }
                content.addAll(read(emphasized, delimiter, allowLinks));
            } else {
                plain.append(current);
                cursor++;
            }
        }
        appendText(content, plain, styles);
        return content;
    }

    private boolean isHtmlAtCursor() {
        return HTML.matcher(source).region(cursor, source.length()).lookingAt();
    }

    private boolean closesEmphasis(String closing, ObjectNode styles) {
        if (!source.startsWith(closing, cursor)) {
            return false;
        }
        String opening = delimiterAtCursor();
        if (opening == null || opening.length() <= closing.length()) {
            return true;
        }
        boolean addsBold = opening.length() >= 2 && !styles.path("bold").asBoolean();
        boolean addsItalic = opening.length() != 2 && !styles.path("italic").asBoolean();
        return !(addsBold || addsItalic) || !hasClosing(opening);
    }

    private String delimiterAtCursor() {
        char marker = source.charAt(cursor);
        if (marker != '*' && marker != '_') {
            return null;
        }
        if (marker == '_' && cursor > 0 && Character.isLetterOrDigit(source.charAt(cursor - 1))) {
            return null;
        }
        int count = 1;
        while (count < 3 && cursor + count < source.length() && source.charAt(cursor + count) == marker) {
            count++;
        }
        if (cursor + count == source.length() || Character.isWhitespace(source.charAt(cursor + count))) {
            return null;
        }
        return String.valueOf(marker).repeat(count);
    }

    private boolean hasClosing(String delimiter) {
        int index = cursor + delimiter.length();
        while (index < source.length()) {
            if (source.charAt(index) == '\\' && index + 1 < source.length()
                    && ESCAPABLE.indexOf(source.charAt(index + 1)) >= 0) {
                index += 2;
            } else if (source.charAt(index) == '`') {
                int length = backtickLengthAt(index);
                int end = codeSpanEnd(index, length);
                index = end < 0 ? index + length : end + length;
            } else if (source.startsWith(delimiter, index)) {
                return true;
            } else {
                index++;
            }
        }
        return false;
    }

    private boolean readCode(ArrayNode content, StringBuilder plain, ObjectNode styles) {
        int length = backtickLengthAt(cursor);
        int end = codeSpanEnd(cursor, length);
        if (end < 0) {
            return false;
        }
        appendText(content, plain, styles);
        ObjectNode codeStyle = styles.deepCopy().put("code", true);
        String code = source.substring(cursor + length, end).replace('\n', ' ');
        if (code.startsWith(" ") && code.endsWith(" ") && !code.isBlank()) {
            code = code.substring(1, code.length() - 1);
        }
        appendText(content, new StringBuilder(code), codeStyle);
        cursor = end + length;
        return true;
    }

    private int backtickLengthAt(int start) {
        int length = 1;
        while (start + length < source.length() && source.charAt(start + length) == '`') {
            length++;
        }
        return length;
    }

    private int codeSpanEnd(int start, int length) {
        String delimiter = "`".repeat(length);
        int candidate = source.indexOf(delimiter, start + length);
        while (candidate >= 0) {
            int candidateLength = backtickLengthAt(candidate);
            if (candidateLength == length) {
                return candidate;
            }
            candidate = source.indexOf(delimiter, candidate + candidateLength);
        }
        return -1;
    }

    private boolean readLink(ArrayNode content, StringBuilder plain, ObjectNode styles) {
        int labelEnd = matchingClose(cursor, '[', ']');
        if (labelEnd >= 0 && labelEnd + 1 < source.length() && source.charAt(labelEnd + 1) == '[') {
            throw new PostException(INVALID_POST_CONTENT);
        }
        if (labelEnd < 0 || labelEnd + 1 >= source.length() || source.charAt(labelEnd + 1) != '(') {
            return false;
        }
        int urlEnd = matchingClose(labelEnd + 1, '(', ')');
        if (urlEnd < 0) {
            throw new PostException(INVALID_POST_CONTENT);
        }
        String href = source.substring(labelEnd + 2, urlEnd).replace("\\(", "(").replace("\\)", ")");
        validateHref(href);
        ArrayNode label = new TheRilogMarkdownInlineParser(source.substring(cursor + 1, labelEnd))
                .read(styles, null, false);
        appendText(content, plain, styles);
        ObjectNode link = content.addObject();
        link.put("type", "link").put("href", href).set("content", label);
        cursor = urlEnd + 1;
        return true;
    }

    private int matchingClose(int start, char open, char close) {
        int depth = 0;
        for (int index = start; index < source.length(); index++) {
            char current = source.charAt(index);
            if (current == '\\') {
                index++;
            } else if (current == open) {
                depth++;
            } else if (current == close && --depth == 0) {
                return index;
            }
        }
        return -1;
    }

    private void validateHref(String href) {
        try {
            URI uri = URI.create(href);
            if (href.isBlank() || uri.getRawAuthority() != null && uri.getScheme() == null
                    || uri.getScheme() != null && !LINK_SCHEMES.contains(uri.getScheme().toLowerCase(Locale.ROOT))
                    || ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && (uri.getHost() == null || uri.getUserInfo() != null)) {
                throw new PostException(INVALID_POST_CONTENT);
            }
        } catch (IllegalArgumentException exception) {
            throw new PostException(INVALID_POST_CONTENT);
        }
    }

    private void appendText(ArrayNode content, StringBuilder plain, ObjectNode styles) {
        if (plain.isEmpty()) {
            return;
        }
        ObjectNode text = content.addObject();
        text.put("type", "text").put("text", plain.toString()).set("styles", styles.deepCopy());
        plain.setLength(0);
    }
}
