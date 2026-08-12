package kr.rilog.global.auth;

import kr.rilog.auth.domain.GlobalRole;

public record AuthRequirement(
        boolean authenticationRequired,
        GlobalRole requiredRole
) {

    public static AuthRequirement publicEndpoint() {
        return new AuthRequirement(false, null);
    }

}
