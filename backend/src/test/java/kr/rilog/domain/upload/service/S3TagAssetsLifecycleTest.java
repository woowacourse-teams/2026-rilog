package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.TagStatus;
import kr.rilog.domain.upload.domain.vo.S3TagTarget;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.mockito.Mockito.*;

class S3TagAssetsLifecycleTest {

    private static final Long REQUESTER_ID = 7L;
    private static final String ROOT_DIRECTORY = "rilog/uploads";
    private static final String ADDED_URL = "https://s3.example.com/added.png";
    private static final String REMOVED_URL = "https://s3.example.com/removed.png";
    private static final String RETAINED_URL = "https://s3.example.com/retained.png";
    private static final String ADDED_KEY = ROOT_DIRECTORY
            + "/images/originals/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517.png";
    private static final String REMOVED_KEY = ROOT_DIRECTORY
            + "/images/originals/7-a38e9b2c-4c13-4f52-9c31-0e52d768d517.png";
    private static final String FOREIGN_KEY = ROOT_DIRECTORY
            + "/images/originals/8-a38e9b2c-4c13-4f52-9c31-0e52d768d517.png";
    private static final String LEGACY_KEY = ROOT_DIRECTORY
            + "/images/originals/a38e9b2c-4c13-4f52-9c31-0e52d768d517.png";

    private S3ObjectTagger objectTagger;
    private S3ObjectKeyResolver objectKeyResolver;
    private S3TagAssetsLifecycle lifecycle;

    @BeforeEach
    void setUp() {
        objectTagger = mock(S3ObjectTagger.class);
        objectKeyResolver = mock(S3ObjectKeyResolver.class);
        S3ImageObjectKeyPolicy imageObjectKeyPolicy = new S3ImageObjectKeyPolicy(
                new S3Properties("bucket", "ap-northeast-2", ROOT_DIRECTORY, 10)
        );
        lifecycle = new S3TagAssetsLifecycle(
                objectTagger,
                objectKeyResolver,
                imageObjectKeyPolicy
        );
    }

    @Test
    @DisplayName("자산을 연결하면 CONFIRMED 태그를 지정한다.")
    void attachAssets() {
        when(objectKeyResolver.resolve(ADDED_URL))
                .thenReturn(Optional.of(ADDED_KEY));

        lifecycle.attach(new TagAssets(Set.of(ADDED_URL)));

        verify(objectKeyResolver).resolve(ADDED_URL);
        verify(objectTagger).tag(List.of(
                new S3TagTarget(
                        ADDED_KEY,
                        TagStatus.CONFIRMED
                )
        ));
    }

    @Test
    @DisplayName("자산을 분리하면 TEMPORARY 태그를 지정한다.")
    void detachAssets() {
        when(objectKeyResolver.resolve(REMOVED_URL))
                .thenReturn(Optional.of(REMOVED_KEY));

        lifecycle.detach(REQUESTER_ID, new TagAssets(Set.of(REMOVED_URL)));

        verify(objectKeyResolver).resolve(REMOVED_URL);
        verify(objectTagger).tag(List.of(
                new S3TagTarget(
                        REMOVED_KEY,
                        TagStatus.TEMPORARY
                )
        ));
    }

    @Test
    @DisplayName("추가된 자산은 CONFIRMED, 제거된 자산은 TEMPORARY로 변경한다.")
    void synchronizeAssets() {
        TagAssets previous = new TagAssets(
                Set.of(RETAINED_URL, REMOVED_URL)
        );
        TagAssets current = new TagAssets(
                Set.of(RETAINED_URL, ADDED_URL)
        );

        when(objectKeyResolver.resolve(ADDED_URL))
                .thenReturn(Optional.of(ADDED_KEY));
        when(objectKeyResolver.resolve(REMOVED_URL))
                .thenReturn(Optional.of(REMOVED_KEY));

        lifecycle.synchronize(REQUESTER_ID, previous, current);

        verify(objectKeyResolver).resolve(REMOVED_URL);
        verify(objectKeyResolver).resolve(ADDED_URL);
        verify(objectTagger).tag(List.of(
                new S3TagTarget(
                        ADDED_KEY,
                        TagStatus.CONFIRMED
                ),
                new S3TagTarget(
                        REMOVED_KEY,
                        TagStatus.TEMPORARY
                )
        ));
    }

    @Test
    @DisplayName("자산 변경이 없으면 태깅하지 않는다.")
    void doNothingWhenAssetsAreUnchanged() {
        TagAssets previous =
                new TagAssets(Set.of(RETAINED_URL));
        TagAssets current =
                new TagAssets(Set.of(RETAINED_URL));

        lifecycle.synchronize(REQUESTER_ID, previous, current);

        verifyNoInteractions(objectKeyResolver, objectTagger);
    }

    @Test
    @DisplayName("객체 키를 해석할 수 없는 URL은 태깅 대상에서 제외한다.")
    void ignoreUnresolvableObjectUrl() {
        when(objectKeyResolver.resolve(ADDED_URL))
                .thenReturn(Optional.empty());

        lifecycle.attach(new TagAssets(Set.of(ADDED_URL)));

        verify(objectTagger).tag(List.of());
    }

    @Test
    @DisplayName("다른 사용자가 소유한 이미지는 분리 대상에서 제외한다.")
    void excludeForeignImageFromDetachTargets() {
        when(objectKeyResolver.resolve(REMOVED_URL))
                .thenReturn(Optional.of(FOREIGN_KEY));

        lifecycle.detach(REQUESTER_ID, new TagAssets(Set.of(REMOVED_URL)));

        verify(objectTagger).tag(List.of());
    }

    @Test
    @DisplayName("복사한 게시글에서 다른 사용자의 이미지를 제거해도 임시 상태로 변경하지 않는다.")
    void excludeForeignImageFromSynchronizationTargets() {
        TagAssets previous = new TagAssets(Set.of(REMOVED_URL));
        TagAssets current = new TagAssets(Set.of());
        when(objectKeyResolver.resolve(REMOVED_URL))
                .thenReturn(Optional.of(FOREIGN_KEY));

        lifecycle.synchronize(REQUESTER_ID, previous, current);

        verify(objectTagger).tag(List.of());
    }

    @Test
    @DisplayName("소유자를 확인할 수 없는 기존 이미지 키는 분리 대상에서 제외한다.")
    void excludeLegacyImageFromDetachTargets() {
        when(objectKeyResolver.resolve(REMOVED_URL))
                .thenReturn(Optional.of(LEGACY_KEY));

        lifecycle.detach(REQUESTER_ID, new TagAssets(Set.of(REMOVED_URL)));

        verify(objectTagger).tag(List.of());
    }

    @Test
    @DisplayName("일반 파일은 이미지 소유권 검증과 관계없이 기존대로 태깅한다.")
    void retainExistingFileTaggingBehavior() {
        String fileKey = ROOT_DIRECTORY + "/files/a38e9b2c-4c13-4f52-9c31-0e52d768d517.pdf";
        when(objectKeyResolver.resolve(REMOVED_URL))
                .thenReturn(Optional.of(fileKey));

        lifecycle.detach(REQUESTER_ID, new TagAssets(Set.of(REMOVED_URL)));

        verify(objectTagger).tag(List.of(
                new S3TagTarget(fileKey, TagStatus.TEMPORARY)
        ));
    }

}
