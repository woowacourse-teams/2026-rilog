package kr.rilog.domain.chapter.entity.vo;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NAME_ALREADY_EXISTS;
import static kr.rilog.support.fixure.BlogFixture.createColog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChaptersOfBlogTest {

    private static final Long OWNER_ID = 1L;

    @Test
    @DisplayName("기존 챕터가 없으면 첫 챕터의 순서는 0이다.")
    void createFirstChapterWithZeroOrder() {
        // given
        Blog blog = createBlog();
        ChaptersOfBlog chapters = ChaptersOfBlog.from(List.of());

        // when
        Chapter created = chapters.createNextChapter(blog, "첫 번째");

        // then
        assertThat(created.getOrder()).isZero();
    }

    @Test
    @DisplayName("기존 챕터 수를 순서로 사용해 다음 챕터를 생성한다.")
    void createNextChapterWithNextOrder() {
        // given
        Blog blog = createBlog();
        ChaptersOfBlog chapters = ChaptersOfBlog.from(List.of(
                Chapter.create(blog, "첫 번째", 0),
                Chapter.create(blog, "두 번째", 1)
        ));

        // when
        Chapter created = chapters.createNextChapter(blog, "세 번째");

        // then
        assertThat(created.getOrder()).isEqualTo(2);
    }

    @Test
    @DisplayName("다음 챕터를 생성하면 요청한 이름이 설정된다.")
    void createNextChapterWithRequestedName() {
        // given
        Blog blog = createBlog();
        ChaptersOfBlog chapters = ChaptersOfBlog.from(List.of());

        // when
        Chapter created = chapters.createNextChapter(blog, "개발 이야기");

        // then
        assertThat(created.getName()).isEqualTo("개발 이야기");
    }

    @Test
    @DisplayName("다음 챕터를 생성하면 전달한 블로그에 속한다.")
    void createNextChapterForRequestedBlog() {
        // given
        Blog blog = createBlog();
        ChaptersOfBlog chapters = ChaptersOfBlog.from(List.of());

        // when
        Chapter created = chapters.createNextChapter(blog, "개발 이야기");

        // then
        assertThat(created.belongsTo(blog)).isTrue();
    }

    @Test
    @DisplayName("같은 이름의 챕터가 있으면 생성을 거부한다.")
    void rejectDuplicateName() {
        // given
        Blog blog = createBlog();
        ChaptersOfBlog chapters = ChaptersOfBlog.from(List.of(
                Chapter.create(blog, "개발 이야기", 0)
        ));

        // when & then
        assertThatThrownBy(() -> chapters.createNextChapter(blog, "  개발 이야기  "))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NAME_ALREADY_EXISTS.getMessage());
    }

    private Blog createBlog() {
        User owner = createUser(OWNER_ID);
        return createColog(owner);
    }

}
