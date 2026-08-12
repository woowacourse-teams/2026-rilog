package kr.rilog.auth.application.port;

public interface SecureCredentialService {

    IssuedCredential issueCredential();

    String issueSecret();

    String hash(String rawValue);

    ParsedCredential parse(String credential);

    String pkceChallenge(String verifier);
}
