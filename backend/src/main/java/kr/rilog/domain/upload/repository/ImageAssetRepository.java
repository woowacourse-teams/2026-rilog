package kr.rilog.domain.upload.repository;

import kr.rilog.domain.upload.domain.ImageAsset;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageAssetRepository extends JpaRepository<ImageAsset, Long> {
}
