package kr.rilog.domain.therilog.repository;

import kr.rilog.domain.therilog.entity.TheRilogTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Set;

@Repository
public interface TheRilogTaskRepository extends JpaRepository<TheRilogTask, Long> {

    Optional<TheRilogTask> findBySpreadsheetIdAndRowId(String spreadsheetId, String rowId);

    @Query("""
            SELECT task.rowId
            FROM TheRilogTask task
            WHERE task.spreadsheetId = :spreadsheetId
            """)
    Set<String> findRowIdsBySpreadsheetId(@Param("spreadsheetId") String spreadsheetId);
}
