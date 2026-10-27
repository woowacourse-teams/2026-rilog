package kr.rilog.domain.upload.repository;

import kr.rilog.domain.upload.domain.ImageAsset;
import kr.rilog.domain.upload.domain.ImageReference;
import kr.rilog.domain.upload.domain.enums.ImageReferenceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ImageReferenceRepository extends JpaRepository<ImageReference, Long> {

    // 삭제된 참조도 함께 조회해 같은 사용처에 다시 쓰이면 복구한다.
    List<ImageReference> findAllByReferenceTypeAndReferenceIdAndImageAssetIn(
            ImageReferenceType referenceType,
            Long referenceId,
            Collection<ImageAsset> imageAssets
    );

    List<ImageReference> findAllByReferenceTypeAndReferenceIdInAndDeletedAtIsNull(
            ImageReferenceType referenceType,
            Collection<Long> referenceIds
    );
}
