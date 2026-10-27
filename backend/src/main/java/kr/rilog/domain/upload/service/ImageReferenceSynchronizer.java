package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.ImageAsset;
import kr.rilog.domain.upload.domain.ImageReference;
import kr.rilog.domain.upload.domain.enums.ImageReferenceType;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.repository.ImageAssetRepository;
import kr.rilog.domain.upload.repository.ImageReferenceBulkRepository;
import kr.rilog.domain.upload.repository.ImageReferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 사용처의 이미지 집합에 맞춰 이미지 참조를 만들고 삭제한다.
 *
 * <p>호출한 서비스의 트랜잭션에 참여한다. 참조가 없는 자산의 판정과 자산 상태 변경은 정리 배치가 맡는다.
 */
@Component
@RequiredArgsConstructor
public class ImageReferenceSynchronizer {

    private final ImageAssetRepository imageAssetRepository;
    private final ImageReferenceRepository imageReferenceRepository;
    private final ImageReferenceBulkRepository imageReferenceBulkRepository;
    private final S3ObjectKeyResolver objectKeyResolver;

    @Transactional(propagation = Propagation.MANDATORY)
    public void attach(ImageReferenceType referenceType, Long referenceId, TagAssets assets) {
        apply(referenceType, referenceId, toObjectKeys(assets), Set.of());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void synchronize(ImageReferenceType referenceType, Long referenceId, TagAssets previous, TagAssets current) {
        Set<String> previousKeys = toObjectKeys(previous);
        Set<String> currentKeys = toObjectKeys(current);

        apply(referenceType, referenceId, difference(currentKeys, previousKeys), difference(previousKeys, currentKeys));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void detach(ImageReferenceType referenceType, Long referenceId, TagAssets assets) {
        apply(referenceType, referenceId, Set.of(), toObjectKeys(assets));
    }

    /** 내용 없이 일괄 삭제되는 사용처는 저장된 활성 참조를 기준으로 분리한다. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void detachAll(ImageReferenceType referenceType, Collection<Long> referenceIds) {
        if (referenceIds.isEmpty()) {
            return;
        }

        imageReferenceRepository.softDeleteAllByReferenceTypeAndReferenceIdIn(referenceType, referenceIds, now());
    }

    private void apply(ImageReferenceType referenceType, Long referenceId, Set<String> addedKeys, Set<String> removedKeys) {
        Set<String> changedKeys = new HashSet<>(addedKeys);
        changedKeys.addAll(removedKeys);
        if (changedKeys.isEmpty()) {
            return;
        }

        List<ImageAsset> assets = imageAssetRepository.findAllByObjectKeyIn(changedKeys);
        if (assets.isEmpty()) {
            return;
        }

        Map<Long, ImageReference> references = imageReferenceRepository
                .findAllByReferenceTypeAndReferenceIdAndImageAssetIn(referenceType, referenceId, assets)
                .stream()
                .collect(Collectors.toMap(reference -> reference.getImageAsset().getId(), Function.identity()));

        List<Long> insertAssetIds = new ArrayList<>();
        List<Long> restoreIds = new ArrayList<>();
        List<Long> deleteIds = new ArrayList<>();

        for (ImageAsset asset : assets) {
            ImageReference reference = references.get(asset.getId());
            if (!addedKeys.contains(asset.getObjectKey())) {
                if (reference != null && !reference.isDeleted()) {
                    deleteIds.add(reference.getId());
                }
                continue;
            }

            // 삭제 요청된 자산은 곧 정리되므로 새 참조를 만들지 않는다.
            if (asset.isDeleteRequested()) {
                continue;
            }

            if (reference == null) {
                insertAssetIds.add(asset.getId());
            } else if (reference.isDeleted()) {
                restoreIds.add(reference.getId());
            }
        }

        LocalDateTime now = now();
        imageReferenceBulkRepository.insertAll(referenceType, referenceId, insertAssetIds, now);
        if (!restoreIds.isEmpty()) {
            imageReferenceRepository.restoreAllByIdIn(restoreIds, now);
        }
        if (!deleteIds.isEmpty()) {
            imageReferenceRepository.softDeleteAllByIdIn(deleteIds, now);
        }
    }

    // 벌크 쿼리는 감사 기능을 거치지 않으므로 BaseEntity와 같은 기준의 시각을 직접 넣는다.
    private LocalDateTime now() {
        return LocalDateTime.now();
    }

    private Set<String> toObjectKeys(TagAssets assets) {
        return assets.objectUrls().stream()
                .map(objectKeyResolver::resolve)
                .flatMap(Optional::stream)
                .collect(Collectors.toSet());
    }

    private Set<String> difference(Set<String> source, Set<String> excluded) {
        Set<String> result = new HashSet<>(source);
        result.removeAll(excluded);
        return result;
    }
}
