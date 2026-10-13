package kr.rilog.domain.therilog.infrastructure.sheet;

import com.fasterxml.jackson.annotation.JsonProperty;

record GoogleServiceAccountCredentials(
        @JsonProperty("private_key_id")
        String privateKeyId,
        @JsonProperty("private_key")
        String privateKey,
        @JsonProperty("client_email")
        String clientEmail
) {
}
