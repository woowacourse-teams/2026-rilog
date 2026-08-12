package kr.rilog.auth.application.port;

import java.util.UUID;

public record IssuedCredential(UUID id, String value, String secretHash) {
}
