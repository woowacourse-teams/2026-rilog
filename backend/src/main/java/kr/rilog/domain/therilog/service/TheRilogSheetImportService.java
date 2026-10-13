package kr.rilog.domain.therilog.service;

import kr.rilog.domain.therilog.entity.TheRilogTask;
import kr.rilog.domain.therilog.repository.TheRilogTaskRepository;
import kr.rilog.domain.therilog.service.dto.command.TheRilogTaskImportCommand;
import kr.rilog.domain.therilog.service.dto.result.TheRilogTaskImportResult;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class TheRilogSheetImportService {

    private final TheRilogTaskRepository taskRepository;
    private final Clock clock;
    private final TransactionTemplate importTransaction;

    public TheRilogSheetImportService(TheRilogTaskRepository taskRepository, Clock clock, PlatformTransactionManager transactionManager) {
        this.taskRepository = taskRepository;
        this.clock = clock;
        this.importTransaction = new TransactionTemplate(transactionManager);
        this.importTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public TheRilogTaskImportResult importRequest(TheRilogTaskImportCommand command) {
        try {
            return importTransaction.execute(transaction -> registerNewRequest(command));
        } catch (DataIntegrityViolationException exception) {
            return taskRepository.findBySpreadsheetIdAndRowId(command.spreadsheetId(), command.rowId())
                    .map(task -> TheRilogTaskImportResult.alreadyCollected(task.getId()))
                    .orElseThrow(() -> exception);
        }
    }

    public Set<String> readCollectedRowIds(String spreadsheetId) {
        return taskRepository.findRowIdsBySpreadsheetId(spreadsheetId);
    }

    private TheRilogTaskImportResult registerNewRequest(TheRilogTaskImportCommand command) {
        return taskRepository.findBySpreadsheetIdAndRowId(command.spreadsheetId(), command.rowId())
                .map(task -> TheRilogTaskImportResult.alreadyCollected(task.getId()))
                .orElseGet(() -> {
                    TheRilogTask task = TheRilogTask.collect(command, Instant.now(clock));
                    TheRilogTask saved = taskRepository.saveAndFlush(task);
                    return TheRilogTaskImportResult.created(saved.getId());
                });
    }
}
