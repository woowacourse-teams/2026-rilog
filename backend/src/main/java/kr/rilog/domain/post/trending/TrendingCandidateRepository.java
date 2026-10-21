package kr.rilog.domain.post.trending;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class TrendingCandidateRepository {

    private final JdbcTemplate jdbcTemplate;

    public List<TrendingCandidate> findCandidates(LocalDateTime from, LocalDateTime until) {
        return jdbcTemplate.query("""
                SELECT p.id, p.published_at, COALESCE(v.view_count, 0) AS view_count,
                    (SELECT COUNT(*) FROM comment_anchor a
                     JOIN comment_anchor_selection s ON s.id = a.comment_anchor_selection_id
                     JOIN users writer ON writer.id = a.user_id AND writer.deleted_at IS NULL
                     WHERE s.post_id = p.id AND s.deleted_at IS NULL AND a.deleted_at IS NULL
                       AND a.user_id <> p.user_id
                       AND NOT EXISTS (
                           SELECT 1 FROM blog_member m
                           WHERE m.blog_id = COALESCE(p.colog_id, p.rilog_id) AND m.user_id = a.user_id
                             AND m.status = 'ACTIVE' AND m.deleted_at IS NULL
                       )) AS external_comment_count
                FROM post p
                LEFT JOIN post_view_count v ON v.post_id = p.id
                WHERE p.status = 'PUBLISHED' AND p.visibility = 'PUBLIC' AND p.post_type = 'STANDARD'
                  AND p.deleted_at IS NULL AND p.published_at >= ? AND p.published_at <= ?
                """, (rs, rowNum) -> new TrendingCandidate(
                rs.getLong("id"),
                rs.getTimestamp("published_at").toLocalDateTime(),
                rs.getLong("view_count"),
                rs.getLong("external_comment_count")
        ), from, until);
    }
}
