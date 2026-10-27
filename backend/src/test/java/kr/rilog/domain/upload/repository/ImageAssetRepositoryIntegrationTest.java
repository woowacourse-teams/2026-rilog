package kr.rilog.domain.upload.repository;

import kr.rilog.domain.upload.domain.ImageAsset;
import kr.rilog.domain.upload.domain.ImageReference;
import kr.rilog.domain.upload.domain.enums.ImageReferenceType;
import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageAssetRepositoryIntegrationTest extends ServiceSupport {

    @Autowired
    private ImageAssetRepository imageAssetRepository;

    @Autowired
    private ImageReferenceRepository imageReferenceRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("같은 객체 키로 이미지 자산을 중복 등록할 수 없다.")
    void objectKeyIsUnique() {
        imageAssetRepository.saveAndFlush(ImageAsset.create("images/a.png", 7L, LocalDateTime.now()));

        assertThatThrownBy(() -> imageAssetRepository.saveAndFlush(ImageAsset.create("images/a.png", 7L, LocalDateTime.now())))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("같은 이미지와 사용처의 참조를 중복 등록할 수 없다.")
    void assetAndSourceAreUnique() {
        ImageAsset asset = imageAssetRepository.saveAndFlush(ImageAsset.create("images/a.png", 7L, LocalDateTime.now()));
        imageReferenceRepository.saveAndFlush(ImageReference.create(asset, ImageReferenceType.POST, 10L));

        assertThatThrownBy(() -> imageReferenceRepository.saveAndFlush(ImageReference.create(asset, ImageReferenceType.POST, 10L)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("같은 이미지에 서로 다른 사용처를 등록할 수 있다.")
    void oneAssetCanHaveMultipleSources() {
        ImageAsset asset = imageAssetRepository.saveAndFlush(ImageAsset.create("images/a.png", 7L, LocalDateTime.now()));
        imageReferenceRepository.saveAndFlush(ImageReference.create(asset, ImageReferenceType.POST, 10L));
        imageReferenceRepository.saveAndFlush(ImageReference.create(asset, ImageReferenceType.POST, 20L));
        imageReferenceRepository.saveAndFlush(ImageReference.create(asset, ImageReferenceType.BLOG, 10L));

        assertThat(imageReferenceRepository.findAll()).hasSize(3);
    }

    @Test
    @DisplayName("존재하지 않는 이미지 자산을 참조할 수 없다.")
    void referenceRequiresExistingAsset() {
        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into image_reference (image_asset_id, reference_type, reference_id) values (?, ?, ?)",
                999L, "POST", 10L
        )).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @EnabledIfSystemProperty(named = "spring.profiles.active", matches = "mysql-test")
    @DisplayName("MySQL에서 대소문자가 다른 S3 객체 키는 각각의 자산으로 저장된다.")
    void mysqlObjectKeysAreCaseSensitive() {
        imageAssetRepository.saveAndFlush(ImageAsset.create("images/A.png", 7L, LocalDateTime.now()));
        imageAssetRepository.saveAndFlush(ImageAsset.create("images/a.png", 7L, LocalDateTime.now()));

        assertThat(imageAssetRepository.count()).isEqualTo(2);
    }
}
