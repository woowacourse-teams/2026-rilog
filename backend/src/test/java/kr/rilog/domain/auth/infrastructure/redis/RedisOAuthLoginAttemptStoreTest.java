package kr.rilog.domain.auth.infrastructure.redis;

import kr.rilog.domain.auth.application.oauth.model.OAuthLoginAttempt;
import kr.rilog.domain.auth.application.oauth.model.SocialLoginProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedisOAuthLoginAttemptStoreTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Test
    @DisplayName("state 저장 시 원문이 아닌 SHA-256 해시 key와 TTL을 사용한다")
    void saveStoresHashedStateKeyWithTtl() {
        // given
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        RedisOAuthLoginAttemptStore store = new RedisOAuthLoginAttemptStore(redisTemplate);
        String state = "plain-oauth-state";
        Duration ttl = Duration.ofMinutes(5);

        // when
        store.save(SocialLoginProvider.GITHUB, new OAuthLoginAttempt(state, "/feeds"), ttl);

        // then
        verify(valueOperations).set(
                "oauth:github:state:" + sha256Hex(state),
                "/feeds",
                ttl
        );
    }

    @Test
    @DisplayName("state 소비는 Redis GETDEL로 조회와 삭제를 원자적으로 처리한다")
    void consumeUsesGetAndDeleteAtomically() {
        // given
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        RedisOAuthLoginAttemptStore store = new RedisOAuthLoginAttemptStore(redisTemplate);
        String state = "plain-oauth-state";
        String redisKey = "oauth:github:state:" + sha256Hex(state);
        when(valueOperations.getAndDelete(redisKey)).thenReturn("/feeds");

        // when
        java.util.Optional<OAuthLoginAttempt> consumed = store.consume(SocialLoginProvider.GITHUB, state);

        // then
        assertThat(consumed).contains(new OAuthLoginAttempt(state, "/feeds"));
        verify(valueOperations).getAndDelete(redisKey);
        verify(valueOperations, never()).get(redisKey);
        verify(redisTemplate, never()).delete(redisKey);
    }

    @Test
    @DisplayName("저장되지 않은 state는 소비 실패로 처리한다")
    void consumeReturnsFalseWhenStateDoesNotExist() {
        // given
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        RedisOAuthLoginAttemptStore store = new RedisOAuthLoginAttemptStore(redisTemplate);
        String state = "expired-oauth-state";
        String redisKey = "oauth:github:state:" + sha256Hex(state);
        when(valueOperations.getAndDelete(redisKey)).thenReturn(null);

        // when
        java.util.Optional<OAuthLoginAttempt> consumed = store.consume(SocialLoginProvider.GITHUB, state);

        // then
        assertThat(consumed).isEmpty();
        verify(valueOperations).getAndDelete(redisKey);
    }

    @Test
    @DisplayName("Redis 저장 실패는 작업 문맥과 원인 예외를 보존하되 state 원문을 메시지에 담지 않는다.")
    void saveFailurePreservesOperationContextAndCause() {
        // given
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        RedisConnectionFailureException failure =
                new RedisConnectionFailureException("redis failed state=plain-oauth-state");
        doThrow(failure).when(valueOperations).set(anyString(), anyString(), any(Duration.class));
        RedisOAuthLoginAttemptStore store = new RedisOAuthLoginAttemptStore(redisTemplate);

        // when - then
        assertThatThrownBy(() -> store.save(
                        SocialLoginProvider.GITHUB,
                        new OAuthLoginAttempt("plain-oauth-state", "/feeds"),
                        Duration.ofMinutes(5)
                ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Redis OAuth login attempt save failed")
                .hasMessageNotContaining("plain-oauth-state")
                .hasCause(failure);
    }

    private static String sha256Hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                result.append(String.format("%02x", b));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
