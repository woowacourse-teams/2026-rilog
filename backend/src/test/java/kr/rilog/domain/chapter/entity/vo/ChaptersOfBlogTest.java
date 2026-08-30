package kr.rilog.domain.chapter.entity.vo;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;
import static kr.rilog.support.fixure.BlogFixture.createColog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static org.assertj.core.api.Assertions.*;

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
        assertThat(created.getBlog().getId()).isEqualTo(blog.getId());
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

    @Test
    @DisplayName("대상 챕터의 이름을 중복되지 않은 이름으로 변경한다.")
    void renameChangesTargetName() {
        // given
        Blog blog = createBlog();
        Chapter target = chapterWithId(1L, blog, "개발 이야기", 0);
        Chapter other = chapterWithId(2L, blog, "회고", 1);
        ChaptersOfBlog chapters = ChaptersOfBlog.from(List.of(target, other));

        // when
        chapters.rename(target.getId(), ChapterName.from("새로운 이야기"));

        // then
        assertThat(target.getName()).isEqualTo("새로운 이야기");
        assertThat(other.getName()).isEqualTo("회고");
    }

    @Test
    @DisplayName("대상 챕터는 자기 자신의 이름으로 변경할 수 있다.")
    void renameAllowsTargetOwnName() {
        // given
        Blog blog = createBlog();
        Chapter target = chapterWithId(1L, blog, "개발 이야기", 0);
        ChaptersOfBlog chapters = ChaptersOfBlog.from(List.of(target));

        // when
        Chapter renamed = chapters.rename(target.getId(), ChapterName.from("  개발 이야기  "));

        // then
        assertThat(renamed.getName()).isEqualTo("개발 이야기");
    }

    @Test
    @DisplayName("다른 챕터와 이름이 중복되면 변경을 거부하고 기존 이름을 유지한다.")
    void renameRejectsDuplicateNameAndPreservesTargetName() {
        // given
        Blog blog = createBlog();
        Chapter target = chapterWithId(1L, blog, "개발 이야기", 0);
        Chapter other = chapterWithId(2L, blog, "회고", 1);
        ChaptersOfBlog chapters = ChaptersOfBlog.from(List.of(target, other));

        // when & then
        assertThatThrownBy(() -> chapters.rename(target.getId(), ChapterName.from("  회고  ")))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NAME_ALREADY_EXISTS.getMessage());
        assertThat(target.getName()).isEqualTo("개발 이야기");
    }

    @Test
    @DisplayName("목록에 없는 챕터의 이름을 변경하면 예외가 발생한다.")
    void renameRejectsMissingChapter() {
        // given
        Blog blog = createBlog();
        Chapter chapter = chapterWithId(1L, blog, "개발 이야기", 0);
        ChaptersOfBlog chapters = ChaptersOfBlog.from(List.of(chapter));

        // when & then
        assertThatThrownBy(() -> chapters.rename(2L, ChapterName.from("새로운 이야기")))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("중간 챕터를 삭제하면 남은 챕터의 순서를 0부터 연속되게 재정렬한다.")
    void deleteReordersRemainingChaptersSequentially() {
        // given
        Blog blog = createBlog();
        Chapter first = chapterWithId(1L, blog, "첫 번째", 0);
        Chapter second = chapterWithId(2L, blog, "두 번째", 1);
        Chapter target = chapterWithId(3L, blog, "세 번째", 2);
        Chapter fourth = chapterWithId(4L, blog, "네 번째", 3);
        Chapter fifth = chapterWithId(5L, blog, "다섯 번째", 4);
        Chapter sixth = chapterWithId(6L, blog, "여섯 번째", 5);
        ChaptersOfBlog chapters = ChaptersOfBlog.from(List.of(
                first,
                second,
                target,
                fourth,
                fifth,
                sixth
        ));

        // when
        chapters.delete(target.getId());

        // then
        List<Integer> remainingOrders = List.of(first, second, fourth, fifth, sixth).stream()
                .map(Chapter::getOrder)
                .toList();
        assertThat(remainingOrders).containsExactly(0, 1, 2, 3, 4);
    }

    @Test
    @DisplayName("챕터를 삭제하면 대상 챕터가 논리 삭제된다.")
    void deleteMarksTargetAsDeleted() {
        // given
        Blog blog = createBlog();
        Chapter target = chapterWithId(1L, blog, "개발 이야기", 0);
        ChaptersOfBlog chapters = ChaptersOfBlog.from(List.of(target));

        // when
        Chapter deleted = chapters.delete(target.getId());

        // then
        assertThat(deleted.getDeletedAt()).isNotNull();
    }

    private Blog createBlog() {
        User owner = createUser(OWNER_ID);
        return createColog(owner);
    }

    private Chapter chapterWithId(Long id, Blog blog, String name, int order) {
        return Chapter.builder()
                .id(id)
                .blog(blog)
                .name(ChapterName.from(name))
                .order(order)
                .build();
    }

}
