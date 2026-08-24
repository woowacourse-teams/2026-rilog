package kr.rilog.domain.auth.entity;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshSession {

    private Long userId;

    private String tokenHash;

    private LocalDateTime expiresAt;

    private RefreshSession(Long userId, String tokenHash, LocalDateTime expiresAt) {
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    public static RefreshSession create(Long userId, String tokenHash, LocalDateTime expiresAt) {
        return new RefreshSession(userId, tokenHash, expiresAt);
    }

    public boolean isExpired(LocalDateTime now) {
        return !expiresAt.isAfter(now);
    }
}
