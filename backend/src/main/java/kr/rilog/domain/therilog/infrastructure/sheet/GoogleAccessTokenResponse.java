package kr.rilog.domain.therilog.infrastructure.sheet;

import com.fasterxml.jackson.annotation.JsonProperty;

record GoogleAccessTokenResponse(
        @JsonProperty("access_token")
        String accessToken,
        @JsonProperty("token_type")
        String tokenType,
        @JsonProperty("expires_in")
        Long expiresIn
) {
}
