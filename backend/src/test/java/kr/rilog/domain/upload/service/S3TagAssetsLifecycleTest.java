package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.TagStatus;
import kr.rilog.domain.upload.domain.vo.S3TagTarget;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.mockito.Mockito.*;

class S3TagAssetsLifecycleTest {

    private static final String ADDED_URL = "https://s3.example.com/added.png";
    private static final String REMOVED_URL = "https://s3.example.com/removed.png";
    private static final String RETAINED_URL = "https://s3.example.com/retained.png";

    private S3ObjectTagger objectTagger;
    private S3ObjectKeyResolver objectKeyResolver;
    private S3TagAssetsLifecycle lifecycle;

    @BeforeEach
    void setUp() {
        objectTagger = mock(S3ObjectTagger.class);
        objectKeyResolver = mock(S3ObjectKeyResolver.class);
        lifecycle = new S3TagAssetsLifecycle(
                objectTagger,
                objectKeyResolver
        );
    }

    @Test
    @DisplayName("자산을 연결하면 CONFIRMED 태그를 지정한다.")
    void attachAssets() {
        when(objectKeyResolver.resolve(ADDED_URL))
                .thenReturn(Optional.of("images/added.png"));

        lifecycle.attach(new TagAssets(Set.of(ADDED_URL)));

        verify(objectKeyResolver).resolve(ADDED_URL);
        verify(objectTagger).tag(List.of(
                new S3TagTarget(
                        "images/added.png",
                        TagStatus.CONFIRMED
                )
        ));
    }

    @Test
    @DisplayName("자산을 분리하면 TEMPORARY 태그를 지정한다.")
    void detachAssets() {
        when(objectKeyResolver.resolve(REMOVED_URL))
                .thenReturn(Optional.of("images/removed.png"));

        lifecycle.detach(new TagAssets(Set.of(REMOVED_URL)));

        verify(objectKeyResolver).resolve(REMOVED_URL);
        verify(objectTagger).tag(List.of(
                new S3TagTarget(
                        "images/removed.png",
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
                .thenReturn(Optional.of("images/added.png"));
        when(objectKeyResolver.resolve(REMOVED_URL))
                .thenReturn(Optional.of("images/removed.png"));

        lifecycle.synchronize(previous, current);

        verify(objectKeyResolver).resolve(REMOVED_URL);
        verify(objectKeyResolver).resolve(ADDED_URL);
        verify(objectTagger).tag(List.of(
                new S3TagTarget(
                        "images/added.png",
                        TagStatus.CONFIRMED
                ),
                new S3TagTarget(
                        "images/removed.png",
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

        lifecycle.synchronize(previous, current);

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

}
