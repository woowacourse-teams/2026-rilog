package kr.rilog.domain.auth.infrastructure.redis;

import kr.rilog.domain.auth.application.oauth.SocialLoginProvider;
import kr.rilog.domain.auth.application.port.oauth.OAuthLoginAttemptStore;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Locale;

@Component
public class RedisOAuthLoginAttemptStore implements OAuthLoginAttemptStore {

    private static final String KEY_PREFIX_FORMAT = "oauth:%s:state:";
    private static final String PENDING_VALUE = "pending";
    private static final char[] HEX = "0123456789abcdef".toCharArray();

    private final StringRedisTemplate redisTemplate;

    public RedisOAuthLoginAttemptStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void save(SocialLoginProvider provider, String state, Duration ttl) {
        redisTemplate.opsForValue().set(keyOf(provider, state), PENDING_VALUE, ttl);
    }

    @Override
    public boolean consume(SocialLoginProvider provider, String state) {
        String value = redisTemplate.opsForValue().getAndDelete(keyOf(provider, state));
        return PENDING_VALUE.equals(value);
    }

    private String keyOf(SocialLoginProvider provider, String state) {
        return KEY_PREFIX_FORMAT.formatted(provider.name().toLowerCase(Locale.ROOT)) + sha256Hex(state);
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
