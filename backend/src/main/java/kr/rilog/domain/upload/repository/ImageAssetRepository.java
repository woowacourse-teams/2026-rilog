package kr.rilog.domain.upload.repository;

import kr.rilog.domain.upload.domain.ImageAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ImageAssetRepository extends JpaRepository<ImageAsset, Long> {

    List<ImageAsset> findAllByObjectKeyIn(Collection<String> objectKeys);

    @Query("""
            SELECT asset.objectKey
            FROM ImageAsset asset
            WHERE asset.objectKey IN :objectKeys
            """)
    List<String> findObjectKeysIn(@Param("objectKeys") Collection<String> objectKeys);
}
