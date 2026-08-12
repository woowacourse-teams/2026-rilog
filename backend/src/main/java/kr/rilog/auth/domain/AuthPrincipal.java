package kr.rilog.auth.domain;

import java.util.Objects;

public record AuthPrincipal(Long userId, GlobalRole role) {

    public AuthPrincipal {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId must be positive");
        }
        Objects.requireNonNull(role, "role must not be null");
    }

}
