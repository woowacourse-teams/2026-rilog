package kr.rilog.domain.therilog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.therilog.entity.enums.TheRilogContentType;
import kr.rilog.domain.therilog.entity.enums.TheRilogTaskStatus;
import kr.rilog.domain.therilog.exception.TheRilogTaskException;
import kr.rilog.domain.therilog.service.dto.command.TheRilogTaskImportCommand;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.net.URI;
import java.time.Instant;

import static kr.rilog.domain.therilog.exception.TheRilogTaskErrorInformation.INVALID_THE_RILOG_TASK_INPUT;

@Getter
@Entity
@SuperBuilder
@Table(
        name = "the_rilog_task",
        uniqueConstraints = @UniqueConstraint(name = "uk_the_rilog_task_sheet_row", columnNames = {
                "spreadsheet_id",
                "row_id"
        })
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TheRilogTask extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128, updatable = false)
    private String spreadsheetId;

    @Column(nullable = false, length = 128, updatable = false)
    private String rowId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32, updatable = false)
    private TheRilogContentType contentType;

    @Column(length = 2048, updatable = false)
    private String sourceUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32, updatable = false)
    private Category category;

    @Column(nullable = false, updatable = false)
    private Instant scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private TheRilogTaskStatus status;

    @Column(nullable = false, updatable = false)
    private Instant collectedAt;

    private Long postId;

    private Instant publishedAt;

    public static TheRilogTask collect(TheRilogTaskImportCommand command, Instant collectedAt) {
        validate(command, collectedAt);
        return TheRilogTask.builder()
                .spreadsheetId(command.spreadsheetId())
                .rowId(command.rowId())
                .contentType(command.contentType())
                .sourceUrl(command.sourceUrl())
                .category(command.category())
                .scheduledAt(command.scheduledAt())
                .status(TheRilogTaskStatus.PRODUCTION_PENDING)
                .collectedAt(collectedAt)
                .build();
    }

    private static void validate(TheRilogTaskImportCommand command, Instant collectedAt) {
        if (command == null
                || !isValidId(command.spreadsheetId())
                || !isValidId(command.rowId())
                || command.contentType() == null
                || command.category() == null
                || command.scheduledAt() == null
                || collectedAt == null) {
            throw new TheRilogTaskException(INVALID_THE_RILOG_TASK_INPUT);
        }
        if (command.contentType() == TheRilogContentType.SPOTLIGHT && !isHttpUrl(command.sourceUrl())) {
            throw new TheRilogTaskException(INVALID_THE_RILOG_TASK_INPUT);
        }
        if (command.contentType() == TheRilogContentType.NEWS && command.sourceUrl() != null) {
            throw new TheRilogTaskException(INVALID_THE_RILOG_TASK_INPUT);
        }
    }

    private static boolean isValidId(String value) {
        return value != null && !value.isBlank() && value.length() <= 128 && value.equals(value.strip());
    }

    private static boolean isHttpUrl(String value) {
        if (value == null || value.isBlank() || value.length() > 2048) {
            return false;
        }
        try {
            URI uri = URI.create(value);
            return ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && uri.getUserInfo() == null;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
