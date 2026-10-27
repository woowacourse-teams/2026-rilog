package kr.rilog.domain.upload.domain;

import jakarta.persistence.*;
import kr.rilog.domain.upload.domain.enums.ImageAssetStatus;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

import static kr.rilog.domain.upload.exception.UploadErrorInformation.INVALID_UPLOAD_TARGET;

@Table(name = "image_asset", uniqueConstraints = @UniqueConstraint(name = "uk_image_asset_object_key", columnNames = "object_key"))
@Getter
@Entity
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ImageAsset extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "object_key", nullable = false, updatable = false, length = 512)
    private String objectKey;

    @Column(name = "uploader_id", nullable = false, updatable = false)
    private Long uploaderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ImageAssetStatus status;

    @Column(name = "unreferenced_at")
    private LocalDateTime unreferencedAt;

    public static ImageAsset create(String objectKey, Long uploaderId, LocalDateTime now) {
        if (objectKey == null || objectKey.isBlank() || objectKey.length() > 512 || uploaderId == null || now == null) {
            throw new UploadException(INVALID_UPLOAD_TARGET);
        }

        return ImageAsset.builder()
                .objectKey(objectKey)
                .uploaderId(uploaderId)
                .status(ImageAssetStatus.ACTIVE)
                .unreferencedAt(now)
                .build();
    }
}
