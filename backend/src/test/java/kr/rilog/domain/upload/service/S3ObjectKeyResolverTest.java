package kr.rilog.domain.upload.service;

import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class S3ObjectKeyResolverTest {

    private static final String BUCKET = "rilog-bucket";
    private static final String REGION = "ap-northeast-2";
    private static final String ROOT_DIRECTORY = "images";

    private S3ObjectKeyResolver resolver;

    @BeforeEach
    void setUp() {
        S3Properties properties = new S3Properties(BUCKET, REGION, ROOT_DIRECTORY, 10);
        resolver = new S3ObjectKeyResolver(properties);
    }

    @Test
    @DisplayName("설정된 S3 주소에서 디코딩된 객체 키를 추출한다.")
    void resolveObjectKeyFromConfiguredS3Url() {
        String objectUrl = "https://rilog-bucket.s3.ap-northeast-2.amazonaws.com/rilog/images/2026/a%20b.png";

        Optional<String> objectKey = resolver.resolve(objectUrl);

        assertThat(objectKey).contains("rilog/images/2026/a b.png");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " "})
    @DisplayName("S3 객체 주소가 비어 있으면 객체 키를 추출하지 않는다.")
    void returnEmptyWhenObjectUrlIsBlank(String objectUrl) {
        assertThat(resolver.resolve(objectUrl)).isEmpty();
    }

    @Test
    @DisplayName("S3 객체 주소의 형식이 올바르지 않으면 객체 키를 추출하지 않는다.")
    void returnEmptyWhenObjectUrlIsMalformed() {
        assertThat(resolver.resolve("not a valid URI"))
                .isEmpty();
    }

    @Test
    @DisplayName("S3 객체 주소가 HTTPS가 아니면 객체 키를 추출하지 않는다.")
    void returnEmptyWhenSchemeIsNotHttps() {
        String objectUrl = "http://rilog-bucket.s3.ap-northeast-2.amazonaws.com/images/image.png";

        assertThat(resolver.resolve(objectUrl)).isEmpty();
    }

    @Test
    @DisplayName("S3 객체 주소가 설정된 버킷과 리전의 호스트가 아니면 객체 키를 추출하지 않는다.")
    void returnEmptyWhenHostIsNotConfiguredHost() {
        String objectUrl = "https://other-bucket.s3.ap-northeast-2.amazonaws.com/images/image.png";

        assertThat(resolver.resolve(objectUrl)).isEmpty();
    }

    @Test
    @DisplayName("S3 객체 주소에 객체 키가 없으면 객체 키를 추출하지 않는다.")
    void returnEmptyWhenObjectKeyIsMissing() {
        String objectUrl = "https://rilog-bucket.s3.ap-northeast-2.amazonaws.com/";

        assertThat(resolver.resolve(objectUrl)).isEmpty();
    }

    @Test
    @DisplayName("S3 객체 키가 설정된 루트 디렉터리 밖에 있으면 객체 키를 추출하지 않는다.")
    void returnEmptyWhenObjectKeyIsOutsideRootDirectory() {
        String objectUrl = "https://rilog-bucket.s3.ap-northeast-2.amazonaws.com/files/image.png";

        assertThat(resolver.resolve(objectUrl)).isEmpty();
    }

    @Test
    @DisplayName("S3 객체 키의 디렉터리 이름이 루트 디렉터리의 접두어만 공유하면 객체 키를 추출하지 않는다.")
    void returnEmptyWhenDirectoryOnlySharesRootPrefix() {
        String objectUrl = "https://rilog-bucket.s3.ap-northeast-2.amazonaws.com/images-backup/image.png";

        assertThat(resolver.resolve(objectUrl)).isEmpty();
    }

}
