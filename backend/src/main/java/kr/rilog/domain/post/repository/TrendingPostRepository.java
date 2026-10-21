package kr.rilog.domain.post.repository;

import kr.rilog.domain.post.trending.TrendingScore;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class TrendingPostRepository {

    private static final int JDBC_BATCH_SIZE = 100;

    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public void replaceAll(List<TrendingScore> scores, LocalDateTime calculatedAt) {
        jdbcTemplate.update("DELETE FROM trending_post");
        if (scores.isEmpty()) return;
        jdbcTemplate.batchUpdate("INSERT INTO trending_post (post_id, score, calculated_at) VALUES (?, ?, ?)",
                scores, JDBC_BATCH_SIZE, (statement, score) -> {
                    statement.setLong(1, score.postId());
                    statement.setBigDecimal(2, score.score());
                    statement.setTimestamp(3, Timestamp.valueOf(calculatedAt));
                });
    }
}
