package kr.rilog.auth.presentation.dto;

import jakarta.validation.constraints.NotBlank;

public record ExchangeTokenRequest(
        @NotBlank String code
) {

}
