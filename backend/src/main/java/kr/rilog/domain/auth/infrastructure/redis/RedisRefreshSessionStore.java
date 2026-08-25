package kr.rilog.domain.auth.infrastructure.redis;

import kr.rilog.domain.auth.application.port.token.RefreshSessionStore;
import kr.rilog.domain.auth.entity.RefreshSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisRefreshSessionStore implements RefreshSessionStore {

    private static final String KEY_PREFIX = "refresh:";
    private static final String VALUE_DELIMITER = "\\|";
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final StringRedisTemplate redisTemplate;

    @Override
    public void save(RefreshSession refreshSession, Duration ttl) {
        redisTemplate.opsForValue().set(
                keyOf(refreshSession.getTokenHash()),
                valueOf(refreshSession),
                ttl
        );
    }

    @Override
    public Optional<RefreshSession> findByTokenHash(String tokenHash) {
        String value = redisTemplate.opsForValue().get(keyOf(tokenHash));
        return Optional.ofNullable(value)
                .map(storedValue -> refreshSessionOf(tokenHash, storedValue));
    }

    @Override
    public Optional<RefreshSession> consume(String tokenHash) {
        String value = redisTemplate.opsForValue().getAndDelete(keyOf(tokenHash));
        return Optional.ofNullable(value)
                .map(storedValue -> refreshSessionOf(tokenHash, storedValue));
    }

    @Override
    public void revoke(String tokenHash, LocalDateTime revokedAt) {
        redisTemplate.delete(keyOf(tokenHash));
    }

    private String keyOf(String tokenHash) {
        return KEY_PREFIX + tokenHash;
    }

    private String valueOf(RefreshSession refreshSession) {
        return refreshSession.getUserId() + "|" + refreshSession.getExpiresAt().format(DATE_TIME_FORMATTER);
    }

    private RefreshSession refreshSessionOf(String tokenHash, String value) {
        String[] parts = value.split(VALUE_DELIMITER, 2);
        return RefreshSession.create(
                Long.valueOf(parts[0]),
                tokenHash,
                LocalDateTime.parse(parts[1], DATE_TIME_FORMATTER)
        );
    }

}
