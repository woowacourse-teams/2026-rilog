package kr.rilog.domain.therilog.infrastructure.content;

import kr.rilog.domain.post.exception.PostException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static kr.rilog.domain.post.exception.PostErrorInformation.INVALID_POST_CONTENT;

@Component
public class TheRilogBlockNoteConverter {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final Pattern HEADING = Pattern.compile("^(#{1,6})[ \\t]+(.+)$");
    private static final Pattern LIST_ITEM = Pattern.compile("^( *)([-+*]|[0-9]{1,9}[.)])[ \\t]+(.+)$");
    private static final Pattern FENCE = Pattern.compile("^(`{3,}|~{3,})([^`~]*)$");
    private static final Pattern DIVIDER = Pattern.compile("^(?:\\*[ \\t]*){3,}$|^(?:-[ \\t]*){3,}$|^(?:_[ \\t]*){3,}$");

    public JsonNode convert(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            throw new PostException(INVALID_POST_CONTENT);
        }
        return new Document(markdown.replace("\r\n", "\n").replace('\r', '\n')).convert();
    }

    private static ObjectNode block(String type) {
        ObjectNode block = MAPPER.createObjectNode();
        block.put("id", UUID.randomUUID().toString());
        block.put("type", type);
        ObjectNode props = block.putObject("props");
        if (!"divider".equals(type) && !"codeBlock".equals(type)) {
            props.put("textColor", "default");
            props.put("backgroundColor", "default");
            if (!"quote".equals(type)) {
                props.put("textAlignment", "left");
            }
        }
        block.putArray("children");
        return block;
    }

    private static ObjectNode textBlock(String type, String text) {
        ObjectNode block = block(type);
        block.set("content", TheRilogMarkdownInlineParser.parse(text));
        return block;
    }

    private static class Document {

        private final List<String> lines;
        private int cursor;

        private Document(String markdown) {
            lines = List.of(markdown.split("\n", -1));
        }

        private ArrayNode convert() {
            ArrayNode blocks = MAPPER.createArrayNode();
            while (cursor < lines.size()) {
                String line = lines.get(cursor);
                if (line.isBlank()) {
                    cursor++;
                } else if (FENCE.matcher(line).matches()) {
                    blocks.add(readCode());
                } else if (DIVIDER.matcher(line.strip()).matches()) {
                    blocks.add(block("divider"));
                    cursor++;
                } else if (HEADING.matcher(line).matches()) {
                    blocks.add(readHeading());
                } else if (LIST_ITEM.matcher(line).matches()) {
                    readList(blocks);
                } else if (line.startsWith(">")) {
                    blocks.add(readQuote());
                } else {
                    blocks.add(readParagraph());
                }
            }
            return blocks;
        }

        private ObjectNode readHeading() {
            Matcher heading = HEADING.matcher(lines.get(cursor++));
            heading.matches();
            int level = heading.group(1).length();
            if (level > 4) {
                throw new PostException(INVALID_POST_CONTENT);
            }
            ObjectNode block = textBlock("heading", heading.group(2).replaceFirst("(?:^|[ \\t]+)#+[ \\t]*$", ""));
            ((ObjectNode) block.path("props")).put("level", level).put("isToggleable", false);
            return block;
        }

        private ObjectNode readParagraph() {
            StringBuilder paragraph = new StringBuilder();
            while (cursor < lines.size() && !lines.get(cursor).isBlank()) {
                String line = lines.get(cursor);
                if (!paragraph.isEmpty() && isBlockStart(line)) {
                    break;
                }
                rejectUnsupportedBlock(line);
                if (cursor + 1 < lines.size() && lines.get(cursor + 1).strip().matches("={3,}|-{3,}")) {
                    throw new PostException(INVALID_POST_CONTENT);
                }
                if (!paragraph.isEmpty()) {
                    paragraph.append('\n');
                }
                paragraph.append(line);
                cursor++;
            }
            return textBlock("paragraph", paragraph.toString());
        }

        private boolean isBlockStart(String line) {
            return HEADING.matcher(line).matches()
                    || LIST_ITEM.matcher(line).matches()
                    || FENCE.matcher(line).matches()
                    || DIVIDER.matcher(line.strip()).matches()
                    || line.startsWith(">");
        }

        private void rejectUnsupportedBlock(String line) {
            if (line.startsWith("    ") || line.startsWith("\t")
                    || line.stripLeading().startsWith("```") || line.stripLeading().startsWith("~~~")
                    || line.strip().matches("\\|?[ \\t]*:?-{3,}:?[ \\t]*\\|.*")
                    || line.strip().matches("={3,}")
                    || line.strip().matches("\\[[^]]+]:.*")) {
                throw new PostException(INVALID_POST_CONTENT);
            }
        }

        private ObjectNode readCode() {
            Matcher opening = FENCE.matcher(lines.get(cursor++));
            opening.matches();
            String fence = opening.group(1);
            String language = opening.group(2).strip();
            if (language.contains(" ") || language.contains("\t")) {
                throw new PostException(INVALID_POST_CONTENT);
            }
            List<String> codeLines = new ArrayList<>();
            while (cursor < lines.size()) {
                String line = lines.get(cursor++);
                if (line.strip().matches(Pattern.quote(fence.substring(0, 1)) + "{" + fence.length() + ",}")) {
                    ObjectNode block = block("codeBlock");
                    ((ObjectNode) block.path("props")).put("language", language.isEmpty() ? "text" : language);
                    ObjectNode text = block.putArray("content").addObject();
                    text.put("type", "text").put("text", String.join("\n", codeLines)).putObject("styles");
                    return block;
                }
                codeLines.add(line);
            }
            throw new PostException(INVALID_POST_CONTENT);
        }

        private ObjectNode readQuote() {
            List<String> quotedLines = new ArrayList<>();
            while (cursor < lines.size() && lines.get(cursor).startsWith(">")) {
                String text = lines.get(cursor++).substring(1).stripLeading();
                if (isBlockStart(text)) {
                    throw new PostException(INVALID_POST_CONTENT);
                }
                quotedLines.add(text);
            }
            return textBlock("quote", String.join("\n", quotedLines));
        }

        private void readList(ArrayNode root) {
            List<ListLevel> levels = new ArrayList<>();
            Matcher first = LIST_ITEM.matcher(lines.get(cursor));
            first.matches();
            if (first.group(1).length() > 3) {
                throw new PostException(INVALID_POST_CONTENT);
            }
            levels.add(new ListLevel(first.group(1).length(), root));
            while (cursor < lines.size()) {
                if (lines.get(cursor).isBlank()) {
                    int next = cursor;
                    while (next < lines.size() && lines.get(next).isBlank()) {
                        next++;
                    }
                    if (next == lines.size() || !LIST_ITEM.matcher(lines.get(next)).matches()) {
                        break;
                    }
                    cursor = next;
                }
                Matcher item = LIST_ITEM.matcher(lines.get(cursor));
                if (!item.matches()) {
                    if (lines.get(cursor).startsWith(" ") || lines.get(cursor).startsWith("\t")) {
                        throw new PostException(INVALID_POST_CONTENT);
                    }
                    break;
                }
                int indentation = item.group(1).length();
                ListLevel current = levels.getLast();
                if (indentation > current.indentation()) {
                    ArrayNode children = (ArrayNode) current.blocks().get(current.blocks().size() - 1).path("children");
                    current = new ListLevel(indentation, children);
                    levels.add(current);
                } else {
                    while (indentation < current.indentation() && levels.size() > 1) {
                        levels.removeLast();
                        current = levels.getLast();
                    }
                    if (indentation != current.indentation()) {
                        throw new PostException(INVALID_POST_CONTENT);
                    }
                }
                current.blocks().add(listBlock(item, current.blocks()));
                cursor++;
            }
        }

        private ObjectNode listBlock(Matcher item, ArrayNode siblings) {
            String marker = item.group(2);
            String text = item.group(3);
            if (text.matches("\\[[ xX]](?:[ \\t].*)?")) {
                throw new PostException(INVALID_POST_CONTENT);
            }
            boolean numbered = Character.isDigit(marker.charAt(0));
            ObjectNode block = textBlock(numbered ? "numberedListItem" : "bulletListItem", text);
            if (numbered && (siblings.isEmpty()
                    || !"numberedListItem".equals(siblings.get(siblings.size() - 1).path("type").asString()))) {
                ((ObjectNode) block.path("props")).put("start", Integer.parseInt(marker.substring(0, marker.length() - 1)));
            }
            return block;
        }

        private record ListLevel(int indentation, ArrayNode blocks) {
        }
    }
}
