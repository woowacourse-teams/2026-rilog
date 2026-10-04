package kr.rilog.domain.post.service;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.UncategorizedSQLException;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.mysql.MySQLContainer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("mysql")
class PostViewMigrationTest {

    @Test
    void migratesPublishedPostsAndEnforcesCountAndBatchIntegrity() {
        try (var mysql = new MySQLContainer("mysql:8.4.6").withDatabaseName("view_migration")) {
            mysql.start();
            var dataSource = new DriverManagerDataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
            var jdbc = new JdbcTemplate(dataSource);
            Flyway.configure().dataSource(dataSource).locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("3")).load().migrate();
            seedPosts(jdbc);

            var flyway = Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load();
            assertThat(flyway.migrate().migrationsExecuted).isEqualTo(1);

            assertThat(jdbc.queryForList("select post_id from post_view_count order by post_id", Long.class))
                    .containsExactly(1L, 2L, 3L);
            assertThat(jdbc.queryForList("select view_count from post_view_count", Long.class))
                    .containsExactly(0L, 0L, 0L);
            assertThat(jdbc.queryForObject("select count(*) from post_view_flush_batch", Long.class)).isZero();
            assertThat(jdbc.queryForList("select engine from information_schema.tables where table_schema = database() and table_name in ('post_view_count', 'post_view_flush_batch')", String.class))
                    .containsExactlyInAnyOrder("InnoDB", "InnoDB");

            assertThatThrownBy(() -> jdbc.update("insert into post_view_count values (1, 0)"))
                    .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update("insert into post_view_count values (999, 0)"))
                    .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update("update post_view_count set view_count = -1 where post_id = 1"))
                    .isInstanceOfSatisfying(UncategorizedSQLException.class,
                            error -> assertThat(error.getSQLException().getErrorCode()).isEqualTo(3819));
            assertThatThrownBy(() -> jdbc.update("update post_view_count set view_count = 9007199254740992 where post_id = 1"))
                    .isInstanceOfSatisfying(UncategorizedSQLException.class,
                            error -> assertThat(error.getSQLException().getErrorCode()).isEqualTo(3819));

            String batchId = "00000000-0000-0000-0000-000000000001";
            String insertBatch = "insert into post_view_flush_batch(batch_id, post_id, delta, created_at) values (?, ?, ?, '2026-10-04 00:00:00')";
            jdbc.update(insertBatch, batchId, 1, 10);
            assertThatThrownBy(() -> jdbc.update(insertBatch, batchId, 1, 10))
                    .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update(insertBatch, "00000000-0000-0000-0000-000000000002", 999, 10))
                    .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update(insertBatch, "00000000-0000-0000-0000-000000000003", 1, 0))
                    .isInstanceOfSatisfying(UncategorizedSQLException.class,
                            error -> assertThat(error.getSQLException().getErrorCode()).isEqualTo(3819));

            jdbc.update("update post_view_count set view_count = 10 where post_id = 1");
            jdbc.update("update post set title = 'modified' where id = 1");
            assertThat(jdbc.queryForObject("select view_count from post_view_count where post_id = 1", Long.class)).isEqualTo(10);
            assertThat(flyway.migrate().migrationsExecuted).isZero();
            assertThat(jdbc.queryForObject("select view_count from post_view_count where post_id = 1", Long.class)).isEqualTo(10);
        }
    }

    private void seedPosts(JdbcTemplate jdbc) {
        jdbc.update("insert into users(id, github_id, global_role, onboarding_status) values (1, 1, 'USER', 'COMPLETED')");
        jdbc.update("insert into blog(id, blog_type, name, slug, owner_id) values (1, 'RILOG', 'writer', 'writer', 1)");
        jdbc.update("""
                insert into post(id, content, status, visibility, rilog_id, user_id, deleted_at)
                values (1, '{}', 'PUBLISHED', 'PUBLIC', 1, 1, null),
                       (2, '{}', 'PUBLISHED', 'PRIVATE', 1, 1, null),
                       (3, '{}', 'PUBLISHED', 'PUBLIC', 1, 1, '2026-10-03 00:00:00'),
                       (4, '{}', 'DRAFT', 'PRIVATE', 1, 1, null)
                """);
    }
}
