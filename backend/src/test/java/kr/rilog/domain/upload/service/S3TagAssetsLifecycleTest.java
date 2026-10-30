package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.TagStatus;
import kr.rilog.domain.upload.domain.vo.S3TagTarget;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

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

    private static final String RAW_KEY = ROOT_DIRECTORY
            + "/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png";
    private static final String PROFILE_RAW_KEY = ROOT_DIRECTORY
            + "/profiles/raw/7-c38e9b2c-4c13-4f52-9c31-0e52d768d517/original.jpg";

    private S3ObjectTagger objectTagger;
    private S3ObjectKeyResolver objectKeyResolver;
    private ImageCompactionRequester imageCompactionRequester;
    private S3TagAssetsLifecycle lifecycle;

    @BeforeEach
    void setUp() {
        objectTagger = mock(S3ObjectTagger.class);
        objectKeyResolver = mock(S3ObjectKeyResolver.class);
        imageCompactionRequester = mock(ImageCompactionRequester.class);
        S3Properties properties = new S3Properties("bucket", "ap-northeast-2", ROOT_DIRECTORY, 10);
        lifecycle = new S3TagAssetsLifecycle(
                objectTagger,
                objectKeyResolver,
                new S3ImageObjectKeyPolicy(properties),
                new S3CompactObjectKeyPolicy(properties),
                imageCompactionRequester
        );
    }

    @Test
    @DisplayName("CONFIRMED 태깅에 성공한 raw 원본마다 압축을 요청한다.")
    void requestCompactionForConfirmedRawImages() {
        List<S3TagTarget> targets = List.of(
                new S3TagTarget(RAW_KEY, TagStatus.CONFIRMED),
                new S3TagTarget(PROFILE_RAW_KEY, TagStatus.CONFIRMED)
        );
        when(objectKeyResolver.resolve(ADDED_URL)).thenReturn(Optional.of(RAW_KEY));
        when(objectKeyResolver.resolve(RETAINED_URL)).thenReturn(Optional.of(PROFILE_RAW_KEY));
        when(objectTagger.tag(anyList())).thenReturn(targets);

        lifecycle.attach(new TagAssets(Set.of(ADDED_URL, RETAINED_URL)));

        verify(imageCompactionRequester).request(RAW_KEY);
        verify(imageCompactionRequester).request(PROFILE_RAW_KEY);
        verifyNoMoreInteractions(imageCompactionRequester);
    }

    @Test
    @DisplayName("태깅에 실패한 원본은 압축을 요청하지 않는다.")
    void doNotRequestCompactionWhenTaggingFails() {
        when(objectKeyResolver.resolve(ADDED_URL)).thenReturn(Optional.of(RAW_KEY));
        when(objectTagger.tag(anyList())).thenReturn(List.of());

        lifecycle.attach(new TagAssets(Set.of(ADDED_URL)));

        verifyNoInteractions(imageCompactionRequester);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.gif",
            "/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.svg",
            "/images/compact/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/750.webp",
            "/images/originals/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517.png"
    })
    @DisplayName("변환하지 않는 형식, 압축본, 기존 originals 원본은 압축을 요청하지 않는다.")
    void doNotRequestCompactionForNonCompactableKeys(String path) {
        String key = ROOT_DIRECTORY + path;
        when(objectKeyResolver.resolve(ADDED_URL)).thenReturn(Optional.of(key));
        when(objectTagger.tag(anyList())).thenReturn(List.of(new S3TagTarget(key, TagStatus.CONFIRMED)));

        lifecycle.attach(new TagAssets(Set.of(ADDED_URL)));

        verifyNoInteractions(imageCompactionRequester);
    }

    @Test
    @DisplayName("동기화에서는 새로 CONFIRMED가 된 원본만 압축하고 TEMPORARY로 바뀐 원본은 압축하지 않는다.")
    void requestCompactionOnlyForAddedImagesWhenSynchronizing() {
        String removedRawKey = ROOT_DIRECTORY + "/images/raw/7-a38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png";
        when(objectKeyResolver.resolve(ADDED_URL)).thenReturn(Optional.of(RAW_KEY));
        when(objectKeyResolver.resolve(REMOVED_URL)).thenReturn(Optional.of(removedRawKey));
        when(objectTagger.tag(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        lifecycle.synchronize(
                REQUESTER_ID,
                new TagAssets(Set.of(RETAINED_URL, REMOVED_URL)),
                new TagAssets(Set.of(RETAINED_URL, ADDED_URL))
        );

        verify(imageCompactionRequester).request(RAW_KEY);
        verifyNoMoreInteractions(imageCompactionRequester);
    }

    @Test
    @DisplayName("분리는 압축을 요청하지 않는다.")
    void doNotRequestCompactionWhenDetaching() {
        when(objectKeyResolver.resolve(REMOVED_URL)).thenReturn(Optional.of(RAW_KEY));
        when(objectTagger.tag(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        lifecycle.detach(REQUESTER_ID, new TagAssets(Set.of(REMOVED_URL)));

        verifyNoInteractions(imageCompactionRequester);
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

    @ParameterizedTest
    @ValueSource(strings = {"images/raw", "profiles/raw"})
    @DisplayName("신경로 원본도 소유자의 이미지만 분리 대상으로 태깅한다.")
    void detachOnlyOwnedImageInPurposeDirectory(String directory) {
        String ownedKey = ROOT_DIRECTORY + "/" + directory + "/7-a38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png";
        String foreignKey = ROOT_DIRECTORY + "/" + directory + "/8-a38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png";
        when(objectKeyResolver.resolve(REMOVED_URL)).thenReturn(Optional.of(ownedKey));
        when(objectKeyResolver.resolve(RETAINED_URL)).thenReturn(Optional.of(foreignKey));

        lifecycle.detach(REQUESTER_ID, new TagAssets(Set.of(REMOVED_URL, RETAINED_URL)));

        verify(objectTagger).tag(List.of(
                new S3TagTarget(ownedKey, TagStatus.TEMPORARY)
        ));
    }

    @Test
    @DisplayName("다른 사용자의 압축본도 분리 대상에서 제외한다.")
    void excludeForeignCompactImageFromDetachTargets() {
        String foreignCompactKey = ROOT_DIRECTORY + "/images/compact/8-a38e9b2c-4c13-4f52-9c31-0e52d768d517/750.webp";
        when(objectKeyResolver.resolve(REMOVED_URL)).thenReturn(Optional.of(foreignCompactKey));

        lifecycle.detach(REQUESTER_ID, new TagAssets(Set.of(REMOVED_URL)));

        verify(objectTagger).tag(List.of());
    }

    @Test
    @DisplayName("본문 이미지를 썸네일로 쓰다가 썸네일만 바꾸면 본문에 남은 이미지는 TEMPORARY로 바꾸지 않는다.")
    void keepImageStillUsedByContentWhenThumbnailChanges() {
        String contentImageUrl = "https://s3.example.com/content.png";
        String previousThumbnailUrl = "https://s3.example.com/content.png#1200x1500";
        String currentThumbnailUrl = "https://s3.example.com/thumbnail.png#800x600";
        String contentImageKey = ROOT_DIRECTORY + "/images/raw/7-a38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png";
        String thumbnailKey = ROOT_DIRECTORY + "/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png";
        when(objectKeyResolver.resolve(contentImageUrl)).thenReturn(Optional.of(contentImageKey));
        when(objectKeyResolver.resolve(previousThumbnailUrl)).thenReturn(Optional.of(contentImageKey));
        when(objectKeyResolver.resolve(currentThumbnailUrl)).thenReturn(Optional.of(thumbnailKey));

        lifecycle.synchronize(
                REQUESTER_ID,
                new TagAssets(Set.of(contentImageUrl, previousThumbnailUrl)),
                new TagAssets(Set.of(contentImageUrl, currentThumbnailUrl))
        );

        verify(objectTagger).tag(List.of(
                new S3TagTarget(thumbnailKey, TagStatus.CONFIRMED)
        ));
    }

    @Test
    @DisplayName("같은 이미지의 크기 fragment만 바뀌면 태그를 바꾸지 않는다.")
    void doNothingWhenOnlyImageSizeFragmentChanges() {
        String previousUrl = "https://s3.example.com/thumbnail.png#1200x1500";
        String currentUrl = "https://s3.example.com/thumbnail.png#1200x1501";
        String thumbnailKey = ROOT_DIRECTORY + "/images/raw/7-b38e9b2c-4c13-4f52-9c31-0e52d768d517/original.png";
        when(objectKeyResolver.resolve(previousUrl)).thenReturn(Optional.of(thumbnailKey));
        when(objectKeyResolver.resolve(currentUrl)).thenReturn(Optional.of(thumbnailKey));

        lifecycle.synchronize(REQUESTER_ID, new TagAssets(Set.of(previousUrl)), new TagAssets(Set.of(currentUrl)));

        verifyNoInteractions(objectTagger);
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
