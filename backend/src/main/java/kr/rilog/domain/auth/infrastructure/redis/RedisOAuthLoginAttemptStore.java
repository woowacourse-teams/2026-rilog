package kr.rilog.domain.auth.infrastructure.redis;

import kr.rilog.domain.auth.application.port.OAuthLoginAttemptStore;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;

@Component
public class RedisOAuthLoginAttemptStore implements OAuthLoginAttemptStore {

    private static final String KEY_PREFIX = "oauth:github:state:";
    private static final String PENDING_VALUE = "pending";
    private static final char[] HEX = "0123456789abcdef".toCharArray();

    private final StringRedisTemplate redisTemplate;

    public RedisOAuthLoginAttemptStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void save(String state, Duration ttl) {
        redisTemplate.opsForValue().set(keyOf(state), PENDING_VALUE, ttl);
    }

    @Override
    public boolean consume(String state) {
        String value = redisTemplate.opsForValue().getAndDelete(keyOf(state));
        return PENDING_VALUE.equals(value);
    }

    private String keyOf(String state) {
        return KEY_PREFIX + sha256Hex(state);
    }

    private String sha256Hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            char[] result = new char[digest.length * 2];
            for (int index = 0; index < digest.length; index++) {
                int unsignedByte = digest[index] & 0xff;
                result[index * 2] = HEX[unsignedByte >>> 4];
                result[index * 2 + 1] = HEX[unsignedByte & 0x0f];
            }
            return new String(result);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

}
