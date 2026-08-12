package kr.rilog.auth.infrastructure.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.UUID;
import kr.rilog.auth.application.port.LoginExchangeCodeStore;
import kr.rilog.auth.application.port.OAuthLoginAttemptStore;
import kr.rilog.auth.application.port.RefreshSessionStore;
import kr.rilog.auth.application.port.RefreshTokenRecordStore;
import kr.rilog.auth.application.port.UserStore;
import kr.rilog.auth.domain.GithubIdentity;
import kr.rilog.auth.domain.LoginExchangeCode;
import kr.rilog.auth.domain.OAuthLoginAttempt;
import kr.rilog.auth.domain.RefreshSession;
import kr.rilog.auth.domain.RefreshTokenRecord;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@Import(PostgresAuthPersistenceTest.ContainerConfiguration.class)
class PostgresAuthPersistenceTest {

    private static final Instant NOW = Instant.parse("2026-08-12T00:00:00Z");

    @Autowired
    UserStore userStore;

    @Autowired
    OAuthLoginAttemptStore attemptStore;

    @Autowired
    LoginExchangeCodeStore exchangeCodeStore;

    @Autowired
    RefreshSessionStore sessionStore;

    @Autowired
    RefreshTokenRecordStore tokenRecordStore;

    @Autowired
    TransactionTemplate transactionTemplate;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("인증 애그리거트를 저장하고 잠금으로 자격 증명을 조회한다.")
    void persistsAuthenticationAggregateAndLoadsCredentialsWithLocks() {
        // given
        User user = userStore.save(User.registerFromGithub(
                new GithubIdentity(123L, "avatar", "github", null)
        ));
        OAuthLoginAttempt attempt = attemptStore.save(OAuthLoginAttempt.issue(
                "state-hash", "binding-hash", "verifier", NOW.plusSeconds(600)
        ));
        LoginExchangeCode code = exchangeCodeStore.save(LoginExchangeCode.issue(
                user.getId(), "code-hash", NOW.plusSeconds(90)
        ));
        UUID tokenId = UUID.randomUUID();
        RefreshSession session = sessionStore.save(RefreshSession.start(
                user.getId(), tokenId, NOW.plusSeconds(2_592_000), NOW
        ));
        tokenRecordStore.save(RefreshTokenRecord.issue(
                tokenId, session.getId(), "refresh-hash", NOW
        ));

        // when
        OAuthLoginAttempt lockedAttempt = transactionTemplate.execute(
                ignored -> attemptStore.findByStateHashForUpdate("state-hash").orElseThrow()
        );
        LoginExchangeCode lockedCode = transactionTemplate.execute(
                ignored -> exchangeCodeStore.findByIdForUpdate(code.getId()).orElseThrow()
        );
        RefreshSession lockedSession = transactionTemplate.execute(
                ignored -> sessionStore.findByIdForUpdate(session.getId()).orElseThrow()
        );

        // then
        assertEquals(attempt.getId(), lockedAttempt.getId());
        assertEquals(code.getId(), lockedCode.getId());
        assertEquals(session.getId(), lockedSession.getId());
        assertTrue(tokenRecordStore.findById(tokenId).isPresent());
        assertTrue(userStore.findByGithubId(123L).isPresent());
    }

    @Test
    @DisplayName("만료 데이터 정리와 세션 조회에 필요한 인덱스를 생성한다.")
    void createsIndexesRequiredForExpiryCleanupAndSessionLookup() {
        // given
        String indexQuery = "select indexname from pg_indexes where schemaname = 'public'";

        // when
        java.util.List<String> indexes = jdbcTemplate.queryForList(
                indexQuery,
                String.class
        );

        // then
        assertTrue(indexes.contains("idx_oauth_login_attempt_expires_at"));
        assertTrue(indexes.contains("idx_login_exchange_code_expires_at"));
        assertTrue(indexes.contains("idx_refresh_session_user_id"));
        assertTrue(indexes.contains("idx_refresh_session_absolute_expires_at"));
        assertTrue(indexes.contains("idx_refresh_session_revoked_at"));
        assertTrue(indexes.contains("idx_refresh_token_record_session_id"));
        assertTrue(indexes.contains("idx_refresh_token_record_used_at"));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class ContainerConfiguration {

        @Bean
        @ServiceConnection
        PostgreSQLContainer postgresContainer() {
            return new PostgreSQLContainer("postgres:17-alpine");
        }

    }

}
