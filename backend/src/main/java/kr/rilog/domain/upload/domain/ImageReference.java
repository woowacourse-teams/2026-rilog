package kr.rilog.domain.upload.domain;

import jakarta.persistence.*;
import kr.rilog.domain.upload.domain.enums.ImageReferenceType;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import static kr.rilog.domain.upload.exception.UploadErrorInformation.INVALID_UPLOAD_TARGET;

@Table(
        name = "image_reference",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_image_reference_source",
                columnNames = {"image_asset_id", "reference_type", "reference_id"}
        )
)
@Getter
@Entity
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ImageReference extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "image_asset_id", nullable = false, updatable = false)
    private ImageAsset imageAsset;

    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type", nullable = false, updatable = false, length = 32)
    private ImageReferenceType referenceType;

    @Column(name = "reference_id", nullable = false, updatable = false)
    private Long referenceId;

    public static ImageReference create(ImageAsset imageAsset, ImageReferenceType referenceType, Long referenceId) {
        if (imageAsset == null || referenceType == null || referenceId == null) {
            throw new UploadException(INVALID_UPLOAD_TARGET);
        }

        return ImageReference.builder()
                .imageAsset(imageAsset)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .build();
    }

    public boolean isDeleted() {
        return getDeletedAt() != null;
    }
}
