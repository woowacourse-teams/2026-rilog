package kr.rilog.domain.auth.infrastructure.redis;

import kr.rilog.domain.auth.entity.RefreshSession;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedisRefreshSessionStoreTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Test
    @DisplayName("Refresh Session 저장 시 token hash key와 TTL을 사용한다")
    void saveStoresSessionByTokenHashWithTtl() {
        // given
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        RedisRefreshSessionStore store = new RedisRefreshSessionStore(redisTemplate);
        RefreshSession session = RefreshSession.create(
                1L,
                "hashed-refresh-token",
                LocalDateTime.of(2026, 8, 27, 0, 0)
        );
        Duration ttl = Duration.ofDays(14);

        // when
        store.save(session, ttl);

        // then
        verify(valueOperations).set(
                "refresh:hashed-refresh-token",
                "1|2026-08-27T00:00:00",
                ttl
        );
    }

    @Test
    @DisplayName("Refresh Session 조회는 Redis value를 세션 모델로 복원한다")
    void findByTokenHashReturnsRefreshSession() {
        // given
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("refresh:hashed-refresh-token"))
                .thenReturn("1|2026-08-27T00:00:00");
        RedisRefreshSessionStore store = new RedisRefreshSessionStore(redisTemplate);

        // when
        Optional<RefreshSession> session = store.findByTokenHash("hashed-refresh-token");

        // then
        assertThat(session).isPresent();
        assertThat(session.get().getUserId()).isEqualTo(1L);
        assertThat(session.get().getTokenHash()).isEqualTo("hashed-refresh-token");
        assertThat(session.get().getExpiresAt()).isEqualTo(LocalDateTime.of(2026, 8, 27, 0, 0));
    }

    @Test
    @DisplayName("Refresh Session 소비는 Redis GETDEL로 조회와 삭제를 원자적으로 처리한다")
    void consumeUsesGetAndDeleteAtomically() {
        // given
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.getAndDelete("refresh:hashed-refresh-token"))
                .thenReturn("1|2026-08-27T00:00:00");
        RedisRefreshSessionStore store = new RedisRefreshSessionStore(redisTemplate);

        // when
        Optional<RefreshSession> session = store.consume("hashed-refresh-token");

        // then
        assertThat(session).isPresent();
        assertThat(session.get().getUserId()).isEqualTo(1L);
        verify(valueOperations).getAndDelete("refresh:hashed-refresh-token");
        verify(valueOperations, never()).get("refresh:hashed-refresh-token");
        verify(redisTemplate, never()).delete("refresh:hashed-refresh-token");
    }

    @Test
    @DisplayName("Refresh Session 폐기는 Redis key를 삭제한다")
    void revokeDeletesRefreshSessionKey() {
        // given
        RedisRefreshSessionStore store = new RedisRefreshSessionStore(redisTemplate);

        // when
        store.revoke("hashed-refresh-token", LocalDateTime.of(2026, 8, 13, 0, 0));

        // then
        verify(redisTemplate).delete("refresh:hashed-refresh-token");
    }
}
