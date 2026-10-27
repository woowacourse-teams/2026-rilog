package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.ImageAsset;
import kr.rilog.domain.upload.domain.ImageReference;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.repository.ImageAssetRepository;
import kr.rilog.domain.upload.repository.ImageReferenceRepository;
import kr.rilog.global.s3.properties.S3Properties;
import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static kr.rilog.domain.upload.domain.enums.ImageAssetStatus.ACTIVE;
import static kr.rilog.domain.upload.domain.enums.ImageReferenceType.BLOG;
import static kr.rilog.domain.upload.domain.enums.ImageReferenceType.POST;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class ImageReferenceSynchronizerIntegrationTest extends ServiceSupport {

    private static final Long UPLOADER_ID = 7L;
    private static final Long POST_ID = 10L;
    private static final Long OTHER_POST_ID = 20L;
    private static final LocalDateTime UPLOADED_AT = LocalDateTime.of(2026, 10, 1, 12, 0);

    @Autowired
    private ImageReferenceSynchronizer synchronizer;

    @Autowired
    private ImageAssetRepository imageAssetRepository;

    @Autowired
    private ImageReferenceRepository imageReferenceRepository;

    @Autowired
    private S3ImageObjectKeyPolicy imageObjectKeyPolicy;

    @Autowired
    private S3Properties s3Properties;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate transactionTemplate;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Test
    @DisplayName("사용처에 이미지를 연결하면 등록된 이미지마다 참조를 하나씩 만든다.")
    void attachCreatesReferencePerAsset() {
        // given
        ImageAsset assetA = saveAsset();
        ImageAsset assetB = saveAsset();

        // when
        inTransaction(() -> synchronizer.attach(POST, POST_ID, TagAssets.of(urlOf(assetA), urlOf(assetB))));

        // then
        assertThat(activeAssetIdsOf(POST_ID)).containsExactlyInAnyOrder(assetA.getId(), assetB.getId());
    }

    @Test
    @DisplayName("같은 이미지가 URL과 객체 키로 여러 번 쓰여도 참조는 하나만 만든다.")
    void attachCreatesSingleReferenceForDuplicatedImage() {
        // given
        ImageAsset asset = saveAsset();

        // when
        inTransaction(() -> synchronizer.attach(POST, POST_ID, TagAssets.of(urlOf(asset), asset.getObjectKey())));

        // then
        assertThat(imageReferenceRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("등록되지 않은 이미지와 외부 URL, 일반 파일은 참조하지 않는다.")
    void attachSkipsUnregisteredObjects() {
        // given
        String legacyImage = urlOfKey(imageObjectKeyPolicy.create(UPLOADER_ID, UUID.randomUUID(), "png"));
        String file = urlOfKey(s3Properties.rootDirectory() + "/files/" + UUID.randomUUID() + ".pdf");

        // when
        inTransaction(() -> synchronizer.attach(
                POST,
                POST_ID,
                TagAssets.of(legacyImage, file, "https://example.com/external.png")
        ));

        // then
        assertThat(imageReferenceRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("삭제 요청된 이미지는 참조하지 않는다.")
    void attachSkipsDeleteRequestedAsset() {
        // given
        ImageAsset asset = saveAsset();
        jdbcTemplate.update("update image_asset set status = 'DELETE_REQUESTED' where id = ?", asset.getId());

        // when
        inTransaction(() -> synchronizer.attach(POST, POST_ID, TagAssets.of(urlOf(asset))));

        // then
        assertThat(imageReferenceRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("업로더가 아닌 사용자의 사용처도 참조로 등록한다.")
    void attachRegistersReferenceRegardlessOfUploader() {
        // given
        ImageAsset othersAsset = saveAsset(99L);

        // when
        inTransaction(() -> synchronizer.attach(POST, POST_ID, TagAssets.of(urlOf(othersAsset))));

        // then
        assertThat(activeAssetIdsOf(POST_ID)).containsExactly(othersAsset.getId());
    }

    @Test
    @DisplayName("이미지를 동기화하면 추가된 이미지는 참조하고 제거된 이미지는 참조를 삭제하며 유지된 참조는 그대로 둔다.")
    void synchronizeAppliesChanges() {
        // given
        ImageAsset kept = saveAsset();
        ImageAsset removed = saveAsset();
        ImageAsset added = saveAsset();
        TagAssets previous = TagAssets.of(urlOf(kept), urlOf(removed));
        inTransaction(() -> synchronizer.attach(POST, POST_ID, previous));
        Long keptReferenceId = referenceOf(kept, POST_ID).getId();

        // when
        inTransaction(() -> synchronizer.synchronize(POST, POST_ID, previous, TagAssets.of(urlOf(kept), urlOf(added))));

        // then
        assertSoftly(softly -> {
            softly.assertThat(activeAssetIdsOf(POST_ID)).containsExactlyInAnyOrder(kept.getId(), added.getId());
            softly.assertThat(referenceOf(kept, POST_ID).getId()).isEqualTo(keptReferenceId);
            softly.assertThat(referenceOf(removed, POST_ID).getDeletedAt()).isNotNull();
        });
    }

    @Test
    @DisplayName("제거했던 이미지를 다시 추가하면 삭제된 참조를 복구한다.")
    void synchronizeRestoresRemovedReference() {
        // given
        ImageAsset asset = saveAsset();
        TagAssets withImage = TagAssets.of(urlOf(asset));
        TagAssets withoutImage = TagAssets.of();
        inTransaction(() -> synchronizer.attach(POST, POST_ID, withImage));
        Long referenceId = referenceOf(asset, POST_ID).getId();
        inTransaction(() -> synchronizer.synchronize(POST, POST_ID, withImage, withoutImage));

        // when
        inTransaction(() -> synchronizer.synchronize(POST, POST_ID, withoutImage, withImage));

        // then
        ImageReference restored = referenceOf(asset, POST_ID);
        assertSoftly(softly -> {
            softly.assertThat(imageReferenceRepository.findAll()).hasSize(1);
            softly.assertThat(restored.getId()).isEqualTo(referenceId);
            softly.assertThat(restored.getDeletedAt()).isNull();
        });
    }

    @Test
    @DisplayName("여러 이미지의 참조 추가, 복구, 삭제를 한 번의 동기화로 반영한다.")
    void synchronizeAppliesManyChangesAtOnce() {
        // given
        ImageAsset restoredA = saveAsset();
        ImageAsset restoredB = saveAsset();
        ImageAsset removedA = saveAsset();
        ImageAsset removedB = saveAsset();
        ImageAsset addedA = saveAsset();
        ImageAsset addedB = saveAsset();
        TagAssets restoredImages = TagAssets.of(urlOf(restoredA), urlOf(restoredB));
        inTransaction(() -> synchronizer.attach(POST, POST_ID, restoredImages));
        inTransaction(() -> synchronizer.detach(POST, POST_ID, restoredImages));
        TagAssets previous = TagAssets.of(urlOf(removedA), urlOf(removedB));
        inTransaction(() -> synchronizer.attach(POST, POST_ID, previous));
        List<Long> restoredReferenceIds = List.of(
                referenceOf(restoredA, POST_ID).getId(),
                referenceOf(restoredB, POST_ID).getId()
        );
        TagAssets current = TagAssets.of(urlOf(restoredA), urlOf(restoredB), urlOf(addedA), urlOf(addedB));

        // when
        inTransaction(() -> synchronizer.synchronize(POST, POST_ID, previous, current));

        // then
        assertSoftly(softly -> {
            softly.assertThat(activeAssetIdsOf(POST_ID)).containsExactlyInAnyOrder(
                    restoredA.getId(), restoredB.getId(), addedA.getId(), addedB.getId()
            );
            softly.assertThat(List.of(referenceOf(restoredA, POST_ID).getId(), referenceOf(restoredB, POST_ID).getId()))
                    .isEqualTo(restoredReferenceIds);
            softly.assertThat(referenceOf(removedA, POST_ID).isDeleted()).isTrue();
            softly.assertThat(referenceOf(removedB, POST_ID).isDeleted()).isTrue();
            softly.assertThat(imageReferenceRepository.findAll()).hasSize(6);
        });
    }

    @Test
    @DisplayName("한 번에 저장하고 삭제한 참조도 생성 시각과 수정 시각을 기록한다.")
    void bulkOperationsRecordAuditTimes() {
        // given
        ImageAsset asset = saveAsset();
        TagAssets assets = TagAssets.of(urlOf(asset));

        // when
        inTransaction(() -> synchronizer.attach(POST, POST_ID, assets));
        ImageReference created = referenceOf(asset, POST_ID);
        inTransaction(() -> synchronizer.detach(POST, POST_ID, assets));
        ImageReference deleted = referenceOf(asset, POST_ID);

        // then
        assertSoftly(softly -> {
            softly.assertThat(created.getCreatedAt()).isNotNull();
            softly.assertThat(created.getUpdatedAt()).isEqualTo(created.getCreatedAt());
            softly.assertThat(deleted.getDeletedAt()).isNotNull();
            softly.assertThat(deleted.getUpdatedAt()).isEqualTo(deleted.getDeletedAt());
        });
    }

    @Test
    @DisplayName("사용처에서 이미지를 분리해도 다른 사용처의 참조는 그대로 남는다.")
    void detachKeepsOtherReferences() {
        // given
        ImageAsset asset = saveAsset();
        TagAssets assets = TagAssets.of(urlOf(asset));
        inTransaction(() -> synchronizer.attach(POST, POST_ID, assets));
        inTransaction(() -> synchronizer.attach(POST, OTHER_POST_ID, assets));

        // when
        inTransaction(() -> synchronizer.detach(POST, POST_ID, assets));

        // then
        assertSoftly(softly -> {
            softly.assertThat(referenceOf(asset, POST_ID).getDeletedAt()).isNotNull();
            softly.assertThat(referenceOf(asset, OTHER_POST_ID).getDeletedAt()).isNull();
        });
    }

    @Test
    @DisplayName("참조를 만들고 삭제해도 이미지 자산의 상태와 미참조 시각은 바꾸지 않는다.")
    void doesNotChangeAssetState() {
        // given
        ImageAsset asset = saveAsset();
        TagAssets assets = TagAssets.of(urlOf(asset));

        // when
        inTransaction(() -> synchronizer.attach(POST, POST_ID, assets));
        ImageAsset afterAttach = reload(asset);
        inTransaction(() -> synchronizer.detach(POST, POST_ID, assets));
        ImageAsset afterDetach = reload(asset);

        // then
        assertSoftly(softly -> {
            softly.assertThat(afterAttach.getUnreferencedAt()).isEqualTo(UPLOADED_AT);
            softly.assertThat(afterDetach.getUnreferencedAt()).isEqualTo(UPLOADED_AT);
            softly.assertThat(afterDetach.getStatus()).isEqualTo(ACTIVE);
        });
    }

    @Test
    @DisplayName("사용처 타입이 다르면 같은 ID라도 서로의 참조에 영향을 주지 않는다.")
    void detachIsScopedByReferenceType() {
        // given
        ImageAsset asset = saveAsset();
        TagAssets assets = TagAssets.of(urlOf(asset));
        inTransaction(() -> synchronizer.attach(POST, POST_ID, assets));
        inTransaction(() -> synchronizer.attach(BLOG, POST_ID, assets));

        // when
        inTransaction(() -> synchronizer.detach(POST, POST_ID, assets));

        // then
        assertThat(imageReferenceRepository.findAll())
                .filteredOn(reference -> reference.getDeletedAt() == null)
                .extracting(ImageReference::getReferenceType)
                .containsExactly(BLOG);
    }

    @Test
    @DisplayName("여러 사용처를 한 번에 분리하면 저장된 활성 참조를 모두 삭제한다.")
    void detachAllDeletesActiveReferences() {
        // given
        ImageAsset shared = saveAsset();
        ImageAsset only = saveAsset();
        inTransaction(() -> synchronizer.attach(POST, POST_ID, TagAssets.of(urlOf(shared), urlOf(only))));
        inTransaction(() -> synchronizer.attach(POST, OTHER_POST_ID, TagAssets.of(urlOf(shared))));
        inTransaction(() -> synchronizer.attach(POST, 30L, TagAssets.of(urlOf(shared))));

        // when
        inTransaction(() -> synchronizer.detachAll(POST, List.of(POST_ID, OTHER_POST_ID)));

        // then
        assertSoftly(softly -> {
            softly.assertThat(activeAssetIdsOf(POST_ID)).isEmpty();
            softly.assertThat(activeAssetIdsOf(OTHER_POST_ID)).isEmpty();
            softly.assertThat(activeAssetIdsOf(30L)).containsExactly(shared.getId());
        });
    }

    @Test
    @DisplayName("호출한 트랜잭션이 롤백되면 참조 변경도 함께 롤백된다.")
    void rollsBackWithCallerTransaction() {
        // given
        ImageAsset asset = saveAsset();

        // when
        assertThatThrownBy(() -> inTransaction(() -> {
            synchronizer.attach(POST, POST_ID, TagAssets.of(urlOf(asset)));
            throw new IllegalStateException("도메인 저장 실패");
        })).isInstanceOf(IllegalStateException.class);

        // then
        assertThat(imageReferenceRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("트랜잭션 밖에서 호출하면 실패한다.")
    void requiresCallerTransaction() {
        // given
        ImageAsset asset = saveAsset();

        // when & then
        assertThatThrownBy(() -> synchronizer.attach(POST, POST_ID, TagAssets.of(urlOf(asset))))
                .isInstanceOf(IllegalTransactionStateException.class);
    }

    private ImageAsset saveAsset() {
        return saveAsset(UPLOADER_ID);
    }

    private ImageAsset saveAsset(Long uploaderId) {
        String objectKey = imageObjectKeyPolicy.create(uploaderId, UUID.randomUUID(), "png");
        return imageAssetRepository.saveAndFlush(ImageAsset.create(objectKey, uploaderId, UPLOADED_AT));
    }

    private String urlOf(ImageAsset asset) {
        return urlOfKey(asset.getObjectKey());
    }

    private String urlOfKey(String objectKey) {
        return "https://%s.s3.%s.amazonaws.com/%s".formatted(
                s3Properties.bucket(),
                s3Properties.region(),
                objectKey
        );
    }

    private ImageAsset reload(ImageAsset asset) {
        return imageAssetRepository.findById(asset.getId()).orElseThrow();
    }

    private ImageReference referenceOf(ImageAsset asset, Long referenceId) {
        return imageReferenceRepository.findAll().stream()
                .filter(reference -> reference.getImageAsset().getId().equals(asset.getId()))
                .filter(reference -> reference.getReferenceType() == POST)
                .filter(reference -> reference.getReferenceId().equals(referenceId))
                .findFirst()
                .orElseThrow();
    }

    private List<Long> activeAssetIdsOf(Long referenceId) {
        return imageReferenceRepository.findAll().stream()
                .filter(reference -> reference.getReferenceType() == POST)
                .filter(reference -> reference.getReferenceId().equals(referenceId))
                .filter(reference -> reference.getDeletedAt() == null)
                .map(reference -> reference.getImageAsset().getId())
                .toList();
    }

    private void inTransaction(Runnable action) {
        transactionTemplate.executeWithoutResult(status -> action.run());
    }
}
