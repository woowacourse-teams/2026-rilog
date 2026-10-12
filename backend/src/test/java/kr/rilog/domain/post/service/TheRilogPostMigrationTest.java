package kr.rilog.domain.post.service;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.mysql.MySQLContainer;

import javax.sql.DataSource;
import java.util.Arrays;
import java.util.Comparator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("mysql")
class TheRilogPostMigrationTest {

    private static final String MIGRATION_LOCATION = "classpath:db/migration";
    private static final MigrationVersion THE_RILOG_POST_EXTENSION = MigrationVersion.fromVersion("6");
    private static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4.6")
            .withDatabaseName("the_rilog_post_migration");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;

    @BeforeAll
    static void startDatabase() {
        MYSQL.start();
        dataSource = new DriverManagerDataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword());
        jdbc = new JdbcTemplate(dataSource);
    }

    @AfterAll
    static void stopDatabase() {
        MYSQL.stop();
    }

    @BeforeEach
    void migrateToPreviousVersion() {
        Flyway flyway = flyway();
        flyway.clean();
        flyway(latestVersionBeforeTheRilogPostExtension(flyway)).migrate();
    }

    @Test
    @DisplayName("더 리로그 게시글 확장 마이그레이션은 V6에서 한 번만 실행된다.")
    void migratesTheRilogPostExtensionOnlyAtVersionSix() {
        int migrationsExecuted = migrateTheRilogPostExtension();

        assertThat(migrationsExecuted).isEqualTo(1);
    }

    @Test
    @DisplayName("기존 게시글은 더 리로그 게시글 확장 후 모두 일반 글로 백필된다.")
    void backfillsExistingPostsWithStandardPostType() {
        seedPosts();
        migrateTheRilogPostExtension();

        assertThat(jdbc.queryForList("select post_type from post order by id", String.class))
                .containsExactly("STANDARD", "STANDARD", "STANDARD");
    }

    @Test
    @DisplayName("게시글 유형 컬럼은 MySQL enum으로 생성된다.")
    void createsPostTypeAsMysqlEnum() {
        migrateTheRilogPostExtension();

        assertThat(columnValue("post_type", "data_type", String.class)).isEqualTo("enum");
    }

    @Test
    @DisplayName("게시글 유형 컬럼은 새 게시글의 기본값을 일반 글로 저장한다.")
    void savesStandardPostTypeAsDefaultValue() {
        seedUserAndBlog();
        migrateTheRilogPostExtension();

        jdbc.update("""
                insert into post(id, content, status, visibility, rilog_id, user_id)
                values (4, '[]', 'DRAFT', 'PRIVATE', 1, 1)
                """);

        assertThat(jdbc.queryForObject("select post_type from post where id = 4", String.class))
                .isEqualTo("STANDARD");
    }

    @Test
    @DisplayName("게시글 유형 컬럼은 더 리로그 공식 유형을 저장한다.")
    void storesTheRilogPostTypes() {
        seedUserAndBlog();
        migrateTheRilogPostExtension();

        jdbc.update("""
                insert into post(id, content, status, visibility, rilog_id, user_id, post_type)
                values (1, '[]', 'PUBLISHED', 'PUBLIC', 1, 1, 'DAILY_HEADLINES'),
                       (2, '[]', 'PUBLISHED', 'PUBLIC', 1, 1, 'ENTERPRISE_SPOTLIGHT'),
                       (3, '[]', 'PUBLISHED', 'PUBLIC', 1, 1, 'PERSONAL_SPOTLIGHT')
                """);

        assertThat(jdbc.queryForList("select post_type from post order by id", String.class))
                .containsExactly("DAILY_HEADLINES", "ENTERPRISE_SPOTLIGHT", "PERSONAL_SPOTLIGHT");
    }

    @Test
    @DisplayName("게시글 유형 컬럼은 정의되지 않은 값을 거부한다.")
    void rejectsUnknownPostType() {
        seedUserAndBlog();
        migrateTheRilogPostExtension();
        jdbc.update("""
                insert into post(id, content, status, visibility, rilog_id, user_id)
                values (1, '[]', 'PUBLISHED', 'PUBLIC', 1, 1)
                """);

        assertThatThrownBy(() -> jdbc.update("update post set post_type = 'UNKNOWN' where id = 1"))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    @DisplayName("더 리로그 설명 컬럼은 nullable 100자 문자열로 생성된다.")
    void createsNullableDescriptionColumnWithOneHundredCharacters() {
        migrateTheRilogPostExtension();

        assertThat(columnValue("description", "is_nullable", String.class)).isEqualTo("YES");
        assertThat(columnValue("description", "character_maximum_length", Long.class)).isEqualTo(100L);
    }

    @Test
    @DisplayName("기존 게시글의 더 리로그 설명과 출처 정보는 비어 있는 값으로 유지된다.")
    void leavesTheRilogMetadataEmptyForExistingPosts() {
        seedPosts();
        migrateTheRilogPostExtension();

        assertThat(jdbc.queryForList("select description from post order by id", String.class))
                .containsExactly(null, null, null);
        assertThat(jdbc.queryForList("select source_profile_name from post order by id", String.class))
                .containsExactly(null, null, null);
        assertThat(jdbc.queryForList("select source_profile_image from post order by id", String.class))
                .containsExactly(null, null, null);
    }

    @Test
    @DisplayName("출처 정보는 게시글 테이블의 nullable 임베디드 컬럼으로 생성된다.")
    void createsSourceAsNullableEmbeddedColumns() {
        migrateTheRilogPostExtension();

        assertThat(tableCount("post_source")).isZero();
        assertThat(columnValue("source_profile_name", "is_nullable", String.class)).isEqualTo("YES");
        assertThat(columnValue("source_profile_name", "character_maximum_length", Long.class)).isEqualTo(255L);
        assertThat(columnValue("source_profile_image", "is_nullable", String.class)).isEqualTo("YES");
        assertThat(columnValue("source_profile_image", "character_maximum_length", Long.class)).isEqualTo(512L);
    }

    @Test
    @DisplayName("출처 정보는 프로필 이미지가 없어도 이름을 저장한다.")
    void storesSourceNameWithoutProfileImage() {
        seedUserAndBlog();
        migrateTheRilogPostExtension();
        jdbc.update("""
                insert into post(id, content, status, visibility, rilog_id, user_id, source_profile_name, source_profile_image)
                values (1, '[]', 'PUBLISHED', 'PUBLIC', 1, 1, '기업 A', null)
                """);

        assertThat(jdbc.queryForObject("select source_profile_name from post where id = 1", String.class))
                .isEqualTo("기업 A");
        assertThat(jdbc.queryForObject("select source_profile_image from post where id = 1", String.class))
                .isNull();
    }

    @Test
    @DisplayName("더 리로그 게시글 확장 마이그레이션은 다시 실행해도 저장된 게시글 값을 유지한다.")
    void keepsPostValuesWhenMigrationRunsAgain() {
        seedUserAndBlog();
        migrateTheRilogPostExtension();
        jdbc.update("""
                insert into post(id, content, status, visibility, rilog_id, user_id,
                                 post_type, description, source_profile_name, source_profile_image)
                values (1, '[]', 'PUBLISHED', 'PUBLIC', 1, 1,
                        'ENTERPRISE_SPOTLIGHT', '기업 요약', '기업 A', null)
                """);

        assertThat(flyway(THE_RILOG_POST_EXTENSION).migrate().migrationsExecuted).isZero();

        assertThat(jdbc.queryForObject("select post_type from post where id = 1", String.class))
                .isEqualTo("ENTERPRISE_SPOTLIGHT");
        assertThat(jdbc.queryForObject("select description from post where id = 1", String.class))
                .isEqualTo("기업 요약");
        assertThat(jdbc.queryForObject("select source_profile_name from post where id = 1", String.class))
                .isEqualTo("기업 A");
        assertThat(jdbc.queryForObject("select source_profile_image from post where id = 1", String.class))
                .isNull();
    }

    private int migrateTheRilogPostExtension() {
        return flyway(THE_RILOG_POST_EXTENSION).migrate().migrationsExecuted;
    }

    private Flyway flyway(MigrationVersion targetVersion) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations(MIGRATION_LOCATION)
                .target(targetVersion)
                .cleanDisabled(false)
                .load();
    }

    private Flyway flyway() {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations(MIGRATION_LOCATION)
                .cleanDisabled(false)
                .load();
    }

    private MigrationVersion latestVersionBeforeTheRilogPostExtension(Flyway flyway) {
        return Arrays.stream(flyway.info().all())
                .map(info -> info.getVersion())
                .filter(version -> version != null)
                .filter(version -> version.compareTo(THE_RILOG_POST_EXTENSION) < 0)
                .max(Comparator.naturalOrder())
                .orElseThrow();
    }

    private void seedPosts() {
        seedUserAndBlog();
        jdbc.update("""
                insert into post(id, content, status, visibility, rilog_id, user_id, deleted_at)
                values (1, '{}', 'PUBLISHED', 'PUBLIC', 1, 1, null),
                       (2, '{}', 'DRAFT', 'PRIVATE', 1, 1, null),
                       (3, '{}', 'PUBLISHED', 'PUBLIC', 1, 1, '2026-10-03 00:00:00')
                """);
    }

    private void seedUserAndBlog() {
        jdbc.update("insert into users(id, github_id, global_role, onboarding_status) values (1, 1, 'USER', 'COMPLETED')");
        jdbc.update("insert into blog(id, blog_type, name, slug, owner_id) values (1, 'RILOG', 'writer', 'writer', 1)");
    }

    private <T> T columnValue(String columnName, String informationSchemaColumn, Class<T> requiredType) {
        return jdbc.queryForObject("""
                select %s from information_schema.columns
                where table_schema = database()
                  and table_name = 'post'
                  and column_name = ?
                """.formatted(informationSchemaColumn), requiredType, columnName);
    }

    private Long tableCount(String tableName) {
        return jdbc.queryForObject("""
                select count(*)
                from information_schema.tables
                where table_schema = database()
                  and table_name = ?
                """, Long.class, tableName);
    }
}
