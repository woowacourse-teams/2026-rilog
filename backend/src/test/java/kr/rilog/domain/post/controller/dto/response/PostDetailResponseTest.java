package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.controller.dto.response.owner.PostOwnerResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.user.entity.User;
import kr.rilog.global.vo.Slug;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PostDetailResponseTest {

    @Test
    @DisplayName("Rilog 소속 게시글의 owner는 Rilog 정보로 생성된다")
    void fromRilog() {
        // given
        Post post = createPost();

        // when
        PostDetailResponse response = PostDetailResponse.fromRilog(post);
        PostOwnerResponse owner = response.owner();

        // then
        Assertions.assertThat(owner.type()).isEqualTo(BlogType.RILOG);
    }

    @Test
    @DisplayName("Colog 소속 게시글의 owner는 Colog 정보로 생성된다")
    void fromColog() {
        // given
        Post post = createPost();

        // when
        PostDetailResponse response = PostDetailResponse.fromColog(post, 3L, 5L);
        PostOwnerResponse owner = response.owner();

        // then
        Assertions.assertThat(owner.type()).isEqualTo(BlogType.COLOG);
    }

    private Post createPost() {
        User writer = User.builder()
                .id(1L)
                .githubId(1L)
                .build();

        Blog rilog = Blog.builder()
                .id(10L)
                .owner(writer)
                .slug(Slug.from("writer-rilog"))
                .name("작성자 Rilog")
                .blogType(BlogType.RILOG)
                .build();

        Blog colog = Blog.builder()
                .id(20L)
                .owner(writer)
                .slug(Slug.from("team-colog"))
                .name("Rilog 팀")
                .blogType(BlogType.COLOG)
                .build();

        return Post.builder()
                .user(writer)
                .rilog(rilog)
                .colog(colog)
                .title("게시글 제목")
                .category(Category.TECH)
                .build();
    }

}
