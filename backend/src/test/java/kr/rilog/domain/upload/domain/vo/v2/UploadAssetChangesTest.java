package kr.rilog.domain.upload.domain.vo.v2;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UploadAssetChangesTest {

    @Test
    @DisplayName("생성 후 원본 컬렉션이 변경되어도 업로드 자산 변경 내역은 바뀌지 않는다.")
    void preserveChangesWhenSourceCollectionsChange() {
        Set<String> added = new HashSet<>(Set.of("https://cdn.rilog.kr/added.png"));
        Set<String> removed = new HashSet<>(Set.of("https://cdn.rilog.kr/removed.png"));
        UploadAssetChanges changes = new UploadAssetChanges(added, removed);

        added.clear();
        removed.clear();

        assertThat(changes).isEqualTo(new UploadAssetChanges(
                Set.of("https://cdn.rilog.kr/added.png"),
                Set.of("https://cdn.rilog.kr/removed.png")
        ));
    }

    @Test
    @DisplayName("업로드 자산 변경 내역의 컬렉션은 외부에서 변경할 수 없다.")
    void preventChangingCollections() {
        UploadAssetChanges changes = new UploadAssetChanges(
                Set.of("https://cdn.rilog.kr/added.png"),
                Set.of("https://cdn.rilog.kr/removed.png")
        );

        assertThatThrownBy(() -> changes.added().add("https://cdn.rilog.kr/other.png"))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("추가되거나 삭제된 업로드 자산이 없으면 변경 내역이 비어 있다.")
    void changesAreEmptyWhenNothingIsAddedOrRemoved() {
        UploadAssetChanges changes = new UploadAssetChanges(Set.of(), Set.of());

        assertThat(changes.isEmpty()).isTrue();
    }

    @Test
    @DisplayName("추가된 업로드 자산이 있으면 변경 내역이 비어 있지 않다.")
    void changesAreNotEmptyWhenAssetIsAdded() {
        UploadAssetChanges changes = new UploadAssetChanges(
                Set.of("https://cdn.rilog.kr/added.png"),
                Set.of()
        );

        assertThat(changes.isEmpty()).isFalse();
    }

    @Test
    @DisplayName("삭제된 업로드 자산이 있으면 변경 내역이 비어 있지 않다.")
    void changesAreNotEmptyWhenAssetIsRemoved() {
        UploadAssetChanges changes = new UploadAssetChanges(
                Set.of(),
                Set.of("https://cdn.rilog.kr/removed.png")
        );

        assertThat(changes.isEmpty()).isFalse();
    }

}
