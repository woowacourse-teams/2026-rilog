package kr.rilog.domain.post.repository;

import kr.rilog.domain.post.entity.TrendingPost;
import kr.rilog.domain.post.trending.TrendingRank;
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

    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public void replaceAll(List<TrendingRank> ranked, LocalDateTime calculatedAt) {
        if (ranked.size() > TrendingPost.MAX_POSTS) {
            throw new IllegalArgumentException("트렌딩은 최대 36개까지 저장할 수 있습니다.");
        }
        jdbcTemplate.update("DELETE FROM trending_post");
        if (ranked.isEmpty()) return;
        jdbcTemplate.batchUpdate("INSERT INTO trending_post (post_id, score, calculated_at) VALUES (?, ?, ?)",
                ranked, TrendingPost.MAX_POSTS, (statement, rank) -> {
                    statement.setLong(1, rank.postId());
                    statement.setBigDecimal(2, rank.score());
                    statement.setTimestamp(3, Timestamp.valueOf(calculatedAt));
                });
    }
}
