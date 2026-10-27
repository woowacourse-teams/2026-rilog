package kr.rilog.domain.upload.repository;

import kr.rilog.domain.upload.domain.ImageReference;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageReferenceRepository extends JpaRepository<ImageReference, Long> {
}
