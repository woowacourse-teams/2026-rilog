package kr.rilog.auth.application.port;

import java.util.UUID;

public record ParsedCredential(UUID id, String secretHash) {
}
