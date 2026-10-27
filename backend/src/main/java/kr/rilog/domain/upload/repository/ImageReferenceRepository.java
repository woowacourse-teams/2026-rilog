package kr.rilog.domain.upload.repository;

import kr.rilog.domain.upload.domain.ImageAsset;
import kr.rilog.domain.upload.domain.ImageReference;
import kr.rilog.domain.upload.domain.enums.ImageReferenceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface ImageReferenceRepository extends JpaRepository<ImageReference, Long> {

    // 삭제된 참조도 함께 조회해 같은 사용처에 다시 쓰이면 복구한다.
    List<ImageReference> findAllByReferenceTypeAndReferenceIdAndImageAssetIn(
            ImageReferenceType referenceType,
            Long referenceId,
            Collection<ImageAsset> imageAssets
    );

    @Modifying(flushAutomatically = true)
    @Query("""
            UPDATE ImageReference reference
            SET reference.deletedAt = NULL,
                reference.updatedAt = :restoredAt
            WHERE reference.id IN :ids
              AND reference.deletedAt IS NOT NULL
            """)
    int restoreAllByIdIn(
            @Param("ids") Collection<Long> ids,
            @Param("restoredAt") LocalDateTime restoredAt
    );

    @Modifying(flushAutomatically = true)
    @Query("""
            UPDATE ImageReference reference
            SET reference.deletedAt = :deletedAt,
                reference.updatedAt = :deletedAt
            WHERE reference.id IN :ids
              AND reference.deletedAt IS NULL
            """)
    int softDeleteAllByIdIn(
            @Param("ids") Collection<Long> ids,
            @Param("deletedAt") LocalDateTime deletedAt
    );

    @Modifying(flushAutomatically = true)
    @Query("""
            UPDATE ImageReference reference
            SET reference.deletedAt = :deletedAt,
                reference.updatedAt = :deletedAt
            WHERE reference.referenceType = :referenceType
              AND reference.referenceId IN :referenceIds
              AND reference.deletedAt IS NULL
            """)
    int softDeleteAllByReferenceTypeAndReferenceIdIn(
            @Param("referenceType") ImageReferenceType referenceType,
            @Param("referenceIds") Collection<Long> referenceIds,
            @Param("deletedAt") LocalDateTime deletedAt
    );
}
