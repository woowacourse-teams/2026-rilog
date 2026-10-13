package kr.rilog.domain.therilog.service.dto.result;

public record TheRilogTaskImportResult(
        Long taskId,
        ImportStatus status
) {

    public enum ImportStatus {
        CREATED,
        ALREADY_COLLECTED,
        ;
    }

    public static TheRilogTaskImportResult created(Long taskId) {
        return new TheRilogTaskImportResult(taskId, ImportStatus.CREATED);
    }

    public static TheRilogTaskImportResult alreadyCollected(Long taskId) {
        return new TheRilogTaskImportResult(taskId, ImportStatus.ALREADY_COLLECTED);
    }
}
