package kr.rilog.domain.upload.domain.vo.v2;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TagAssetsTest {

    private static final String RETAINED_URL = "https://cdn.rilog.kr/retained.png";
    private static final String ADDED_URL = "https://cdn.rilog.kr/added.png";
    private static final String REMOVED_URL = "https://cdn.rilog.kr/removed.png";

    @Test
    @DisplayName("생성 후 원본 컬렉션이 변경되어도 업로드 자산은 바뀌지 않는다.")
    void preserveAssetsWhenSourceCollectionChanges() {
        Set<String> objectUrls = new HashSet<>(Set.of(RETAINED_URL));
        TagAssets assets = new TagAssets(objectUrls);

        objectUrls.clear();

        assertThat(assets).isEqualTo(new TagAssets(Set.of(RETAINED_URL)));
    }

    @Test
    @DisplayName("업로드 자산의 URL 컬렉션은 외부에서 변경할 수 없다.")
    void preventChangingObjectUrls() {
        TagAssets assets = new TagAssets(Set.of(RETAINED_URL));

        assertThatThrownBy(() -> assets.objectUrls().add(ADDED_URL))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("현재 업로드 자산에만 있는 URL을 추가 내역으로 계산한다.")
    void findAddedAssetUrls() {
        TagAssets previous = new TagAssets(Set.of(RETAINED_URL));
        TagAssets current = new TagAssets(Set.of(RETAINED_URL, ADDED_URL));

        TagAssetChanges changes = previous.changesTo(current);

        assertThat(changes.added()).containsExactly(ADDED_URL);
    }

    @Test
    @DisplayName("이전 업로드 자산에만 있는 URL을 삭제 내역으로 계산한다.")
    void findRemovedAssetUrls() {
        TagAssets previous = new TagAssets(Set.of(RETAINED_URL, REMOVED_URL));
        TagAssets current = new TagAssets(Set.of(RETAINED_URL));

        TagAssetChanges changes = previous.changesTo(current);

        assertThat(changes.removed()).containsExactly(REMOVED_URL);
    }

    @Test
    @DisplayName("이전과 현재 업로드 자산이 같으면 변경 내역이 비어 있다.")
    void changesAreEmptyWhenAssetsAreSame() {
        TagAssets previous = new TagAssets(Set.of(RETAINED_URL));
        TagAssets current = new TagAssets(Set.of(RETAINED_URL));

        TagAssetChanges changes = previous.changesTo(current);

        assertThat(changes.isEmpty()).isTrue();
    }

}
