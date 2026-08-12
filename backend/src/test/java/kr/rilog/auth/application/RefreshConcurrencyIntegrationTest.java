package kr.rilog.auth.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import kr.rilog.auth.application.port.IssuedCredential;
import kr.rilog.auth.application.port.RefreshSessionStore;
import kr.rilog.auth.application.port.RefreshTokenRecordStore;
import kr.rilog.auth.application.port.SecureCredentialService;
import kr.rilog.auth.application.port.UserStore;
import kr.rilog.auth.domain.GithubIdentity;
import kr.rilog.auth.domain.RefreshSession;
import kr.rilog.auth.domain.RefreshTokenRecord;
import kr.rilog.domain.User;
import kr.rilog.global.exception.AuthException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@Import(RefreshConcurrencyIntegrationTest.ContainerConfiguration.class)
class RefreshConcurrencyIntegrationTest {

    private static final Instant NOW = Instant.parse("2026-08-12T00:00:00Z");

    @Autowired
    UserStore userStore;

    @Autowired
    RefreshSessionStore sessionStore;

    @Autowired
    RefreshTokenRecordStore tokenRecordStore;

    @Autowired
    SecureCredentialService credentialService;

    @Autowired
    RefreshLoginSession refreshLoginSession;

    @Autowired
    MutableClock clock;

    @Autowired
    TransactionTemplate transactionTemplate;

    @Test
    void concurrentRefreshRotatesOnceAndLaterReplayRevokesSession() throws Exception {
        User user = userStore.save(User.registerFromGithub(
                new GithubIdentity(991L, "avatar", "github", null)
        ));
        IssuedCredential initial = credentialService.issueCredential();
        RefreshSession session = sessionStore.save(RefreshSession.start(
                user.getId(),
                initial.id(),
                NOW.plus(Duration.ofDays(30)),
                NOW
        ));
        tokenRecordStore.save(RefreshTokenRecord.issue(
                initial.id(), session.getId(), initial.secretHash(), NOW
        ));

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            List<Future<RefreshLoginSession.Result>> futures = List.of(
                    executor.submit(() -> refreshAfterBarrier(initial.value(), ready, start)),
                    executor.submit(() -> refreshAfterBarrier(initial.value(), ready, start))
            );
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();

            RefreshLoginSession.Result first = futures.get(0).get(10, TimeUnit.SECONDS);
            RefreshLoginSession.Result second = futures.get(1).get(10, TimeUnit.SECONDS);
            List<RefreshLoginSession.Result> results = List.of(first, second);

            assertEquals(1, results.stream()
                    .filter(result -> result.refreshToken() != null)
                    .count());
            assertEquals(1, results.stream()
                    .filter(result -> result.refreshToken() == null)
                    .count());
            assertNotNull(first.accessToken());
            assertNotNull(second.accessToken());
        }

        RefreshSession afterConcurrency = loadSession(session.getId());
        assertFalse(afterConcurrency.isRevoked());

        clock.advance(Duration.ofSeconds(5));
        assertThrows(
                AuthException.class,
                () -> refreshLoginSession.refresh(initial.value())
        );

        RefreshSession afterReplay = loadSession(session.getId());
        assertTrue(afterReplay.isRevoked());
        assertNotNull(afterReplay.getReuseDetectedAt());
        assertNotEquals(initial.id(), afterReplay.getCurrentTokenId());
    }

    private RefreshLoginSession.Result refreshAfterBarrier(
            String credential,
            CountDownLatch ready,
            CountDownLatch start
    ) throws InterruptedException {
        ready.countDown();
        if (!start.await(5, TimeUnit.SECONDS)) {
            throw new IllegalStateException("Concurrent refresh start timed out");
        }
        return refreshLoginSession.refresh(credential);
    }

    private RefreshSession loadSession(UUID id) {
        return transactionTemplate.execute(
                ignored -> sessionStore.findByIdForUpdate(id).orElseThrow()
        );
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class ContainerConfiguration {

        @Bean
        @ServiceConnection
        PostgreSQLContainer postgresContainer() {
            return new PostgreSQLContainer("postgres:17-alpine");
        }

        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock(NOW);
        }
    }

    static final class MutableClock extends Clock {
        private final AtomicReference<Instant> instant;

        MutableClock(Instant instant) {
            this.instant = new AtomicReference<>(instant);
        }

        void advance(Duration duration) {
            instant.updateAndGet(current -> current.plus(duration));
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant.get();
        }
    }
}
