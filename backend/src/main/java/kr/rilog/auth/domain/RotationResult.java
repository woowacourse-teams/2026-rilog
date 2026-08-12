package kr.rilog.auth.domain;

public enum RotationResult {
    ROTATED,
    CONCURRENT_REQUEST,
    REUSE_DETECTED,
    INVALID_CREDENTIAL,
    EXPIRED,
    REVOKED
}
