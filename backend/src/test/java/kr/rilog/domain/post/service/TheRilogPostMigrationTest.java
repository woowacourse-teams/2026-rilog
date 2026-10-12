package kr.rilog.domain.post.service;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.mysql.MySQLContainer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("mysql")
class TheRilogPostMigrationTest {

    @Test
    void migratesExistingPostsToStandardAndCreatesPostSourceTable() {
        try (var mysql = new MySQLContainer("mysql:8.4.6").withDatabaseName("the_rilog_post_migration")) {
            mysql.start();
            var dataSource = new DriverManagerDataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
            var jdbc = new JdbcTemplate(dataSource);
            Flyway.configure().dataSource(dataSource).locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("4")).load().migrate();
            seedPosts(jdbc);

            var flyway = Flyway.configure().dataSource(dataSource).locations("classpath:db/migration")
                    .target(MigrationVersion.fromVersion("5")).load();
            assertThat(flyway.migrate().migrationsExecuted).isEqualTo(1);
            assertThat(jdbc.queryForObject("""
                    select data_type from information_schema.columns
                    where table_schema = database() and table_name = 'post' and column_name = 'post_type'
                    """, String.class)).isEqualTo("enum");

            assertThat(jdbc.queryForList("select post_type from post order by id", String.class))
                    .containsExactly("STANDARD", "STANDARD", "STANDARD");
            assertThat(jdbc.queryForList("select description from post order by id", String.class))
                    .containsExactly(null, null, null);
            assertThat(jdbc.queryForObject("select count(*) from post_source", Long.class)).isZero();
            jdbc.update("""
                    insert into post(id, content, status, visibility, rilog_id, user_id)
                    values (4, '[]', 'DRAFT', 'PRIVATE', 1, 1)
                    """);
            assertThat(jdbc.queryForObject("select post_type from post where id = 4", String.class))
                    .isEqualTo("STANDARD");
            assertThat(jdbc.queryForList("""
                    select engine
                    from information_schema.tables
                    where table_schema = database()
                      and table_name = 'post_source'
                    """, String.class)).containsExactly("InnoDB");

            jdbc.update("""
                    insert into post_source(post_id, source_profile_name, source_profile_image)
                    values (1, '기업 A', null)
                    """);
            assertThat(jdbc.queryForObject(
                    "select source_profile_name from post_source where post_id = 1",
                    String.class
            )).isEqualTo("기업 A");

            assertThatThrownBy(() -> jdbc.update("""
                    insert into post_source(post_id, source_profile_name)
                    values (1, '중복')
                    """)).isInstanceOf(DataIntegrityViolationException.class);
            assertThatThrownBy(() -> jdbc.update("""
                    insert into post_source(post_id, source_profile_name)
                    values (999, '없는 글')
                    """)).isInstanceOf(DataIntegrityViolationException.class);
            jdbc.update("update post set post_type = 'ENTERPRISE_SPOTLIGHT', description = '기업 요약' where id = 1");
            jdbc.update("""
                    insert into post(id, content, status, visibility, rilog_id, user_id, post_type)
                    values (5, '[]', 'PUBLISHED', 'PUBLIC', 1, 1, 'DAILY_HEADLINES'),
                           (6, '[]', 'PUBLISHED', 'PUBLIC', 1, 1, 'PERSONAL_SPOTLIGHT')
                    """);
            assertThat(jdbc.queryForList("select post_type from post where id in (1, 5, 6) order by id", String.class))
                    .containsExactly("ENTERPRISE_SPOTLIGHT", "DAILY_HEADLINES", "PERSONAL_SPOTLIGHT");
            assertThatThrownBy(() -> jdbc.update("update post set post_type = 'UNKNOWN' where id = 1"))
                    .isInstanceOf(DataAccessException.class);
            assertThat(flyway.migrate().migrationsExecuted).isZero();
            assertThat(jdbc.queryForObject("select count(*) from post_source", Long.class)).isEqualTo(1L);
            assertThat(jdbc.queryForObject("select description from post where id = 1", String.class))
                    .isEqualTo("기업 요약");
            assertThat(jdbc.queryForObject("select post_type from post where id = 1", String.class))
                    .isEqualTo("ENTERPRISE_SPOTLIGHT");
        }
    }

    private void seedPosts(JdbcTemplate jdbc) {
        jdbc.update("insert into users(id, github_id, global_role, onboarding_status) values (1, 1, 'USER', 'COMPLETED')");
        jdbc.update("insert into blog(id, blog_type, name, slug, owner_id) values (1, 'RILOG', 'writer', 'writer', 1)");
        jdbc.update("""
                insert into post(id, content, status, visibility, rilog_id, user_id, deleted_at)
                values (1, '{}', 'PUBLISHED', 'PUBLIC', 1, 1, null),
                       (2, '{}', 'DRAFT', 'PRIVATE', 1, 1, null),
                       (3, '{}', 'PUBLISHED', 'PUBLIC', 1, 1, '2026-10-03 00:00:00')
                """);
    }
}
