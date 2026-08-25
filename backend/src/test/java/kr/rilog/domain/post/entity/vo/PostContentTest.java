package kr.rilog.domain.post.entity.vo;

import kr.rilog.support.fixure.PostContentFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kr.rilog.support.fixure.PostContentFixture.*;
import static org.assertj.core.api.Assertions.assertThat;

class PostContentTest {

    @Test
    @DisplayName("에디터가 실제로 만든 본문에서 파일과 이미지를 찾는다")
    void extractsFromRealEditorOutput() {
        // given
        PostContent content  = content(imageBlock(IMAGE_URL_A), imageBlock(IMAGE_URL_B));

        // when & then
        assertThat(content.extractFileUrls()).containsExactly(
                PostContentFixture.IMAGE_URL_A,
                PostContentFixture.IMAGE_URL_B
        );
    }

    @Test
    @DisplayName("PostContent끼리 파일 차집합을 찾는다.")
    void findsRemovedUrls() {
        // given
        PostContent before = content(imageBlock(IMAGE_URL_A), imageBlock(IMAGE_URL_B));
        PostContent after = content(imageBlock(IMAGE_URL_A));

        // when & then
        assertThat(before.fileUrlsRemovedIn(after))
                .containsExactly(IMAGE_URL_B);
    }

}
