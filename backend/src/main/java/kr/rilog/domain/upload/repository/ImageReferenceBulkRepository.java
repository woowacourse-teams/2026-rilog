package kr.rilog.domain.upload.repository;

import kr.rilog.domain.upload.domain.enums.ImageReferenceType;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

/**
 * 이미지 참조를 INSERT 한 문장으로 저장한다.
 *
 * <p>ID가 IDENTITY 전략이라 JPA는 INSERT를 묶지 못하고, JDBC batch도 {@code rewriteBatchedStatements}
 * 없이는 MySQL에 한 건씩 전송된다. 그래서 여러 행을 담은 VALUES 절을 직접 만든다.
 */
@Repository
@RequiredArgsConstructor
public class ImageReferenceBulkRepository {

    private static final String INSERT_PREFIX = """
            INSERT INTO image_reference (image_asset_id, reference_type, reference_id, created_at, updated_at)
            VALUES\s""";
    private static final String VALUES_ROW = "(?, ?, ?, ?, ?)";

    private final JdbcTemplate jdbcTemplate;

    public void insertAll(
            ImageReferenceType referenceType,
            Long referenceId,
            Collection<Long> imageAssetIds,
            LocalDateTime createdAt
    ) {
        if (imageAssetIds.isEmpty()) {
            return;
        }

        String sql = INSERT_PREFIX + String.join(", ", Collections.nCopies(imageAssetIds.size(), VALUES_ROW));
        Timestamp timestamp = Timestamp.valueOf(createdAt);
        List<Object> arguments = new ArrayList<>();
        for (Long imageAssetId : imageAssetIds) {
            arguments.add(imageAssetId);
            arguments.add(referenceType.name());
            arguments.add(referenceId);
            arguments.add(timestamp);
            arguments.add(timestamp);
        }

        jdbcTemplate.update(sql, arguments.toArray());
    }
}
