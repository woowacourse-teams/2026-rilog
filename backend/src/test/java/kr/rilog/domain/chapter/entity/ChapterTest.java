package kr.rilog.domain.chapter.entity;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.chapter.entity.vo.ChapterName;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.INVALID_CHAPTER_ORDER;
import static kr.rilog.support.fixure.BlogFixture.createColog;
import static kr.rilog.support.fixure.BlogFixture.createPersistableColog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static kr.rilog.support.fixure.BlogFixture.targetColog;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChapterTest {

    private static final Long OWNER_ID = 1L;

    @Test
    @DisplayName("챕터를 생성하면 전달한 이름이 설정된다.")
    void createSetsName() {
        // given
        Blog blog = createColog(createUser(OWNER_ID));

        // when
        Chapter chapter = Chapter.create(blog, "개발 이야기", 0);

        // then
        assertThat(chapter.getName()).isEqualTo("개발 이야기");
    }

    @Test
    @DisplayName("챕터 순서는 0부터 시작할 수 있다.")
    void createAllowsZeroOrder() {
        // given
        Blog blog = createColog(createUser(OWNER_ID));

        // when
        Chapter chapter = Chapter.create(blog, "개발 이야기", 0);

        // then
        assertThat(chapter.getOrder()).isZero();
    }

    @Test
    @DisplayName("음수 순서로 챕터를 생성하면 예외가 발생한다.")
    void createRejectsNegativeOrder() {
        // given
        Blog blog = createColog(createUser(OWNER_ID));

        // when & then
        assertThatThrownBy(() -> Chapter.create(blog, "개발 이야기", -1))
                .isInstanceOf(ChapterException.class)
                .hasMessage(INVALID_CHAPTER_ORDER.getMessage());
    }

    @Test
    @DisplayName("챕터 이름을 변경하면 새 이름이 반영된다.")
    void renameChangesName() {
        // given
        Chapter chapter = createChapter();

        // when
        chapter.rename(ChapterName.from("새로운 이야기"));

        // then
        assertThat(chapter.getName()).isEqualTo("새로운 이야기");
    }

    @Test
    @DisplayName("챕터 순서를 변경하면 새 순서가 반영된다.")
    void reorderChangesOrder() {
        // given
        Chapter chapter = createChapter();

        // when
        chapter.reorder(3);

        // then
        assertThat(chapter.getOrder()).isEqualTo(3);
    }

    @Test
    @DisplayName("음수 순서로 변경하면 예외가 발생하고 기존 순서가 유지된다.")
    void reorderRejectsNegativeOrderWithoutChangingState() {
        // given
        Chapter chapter = createChapter();

        // when & then
        assertThatThrownBy(() -> chapter.reorder(-1))
                .isInstanceOf(ChapterException.class)
                .hasMessage(INVALID_CHAPTER_ORDER.getMessage());
        assertThat(chapter.getOrder()).isZero();
    }

    @Test
    @DisplayName("같은 블로그 객체의 챕터이면 해당 블로그에 속한다.")
    void belongsToSameBlogInstance() {
        // given
        User owner = createUser(OWNER_ID);
        Blog blog = createPersistableColog(owner, "team-rilog");
        Chapter chapter = Chapter.create(blog, "개발 이야기", 0);

        // when & then
        assertThat(chapter.belongsTo(blog)).isTrue();
    }

    @Test
    @DisplayName("블로그 객체가 달라도 ID가 같으면 해당 블로그에 속한다.")
    void belongsToBlogWithSameId() {
        // given
        Blog chapterBlog = createColog(createUser(OWNER_ID));
        Blog sameIdBlog = createColog(createUser(2L));
        Chapter chapter = Chapter.create(chapterBlog, "개발 이야기", 0);

        // when & then
        assertThat(chapter.belongsTo(sameIdBlog)).isTrue();
    }

    @Test
    @DisplayName("블로그 ID가 다르면 해당 블로그에 속하지 않는다.")
    void doesNotBelongToBlogWithDifferentId() {
        // given
        Blog chapterBlog = createColog(createUser(OWNER_ID));
        Blog otherBlog = targetColog();
        Chapter chapter = Chapter.create(chapterBlog, "개발 이야기", 0);

        // when & then
        assertThat(chapter.belongsTo(otherBlog)).isFalse();
    }

    @Test
    @DisplayName("활성 챕터가 같은 블로그에 속하면 할당할 수 있다.")
    void validateAssignableToAllowsActiveChapterOfBlog() {
        // given
        Blog blog = createColog(createUser(OWNER_ID));
        Chapter chapter = Chapter.create(blog, "개발 이야기", 0);

        // when & then
        assertThatCode(() -> chapter.validateAssignableTo(blog))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("다른 블로그의 챕터는 할당할 수 없다.")
    void validateAssignableToRejectsChapterOfDifferentBlog() {
        // given
        Blog chapterBlog = createColog(createUser(OWNER_ID));
        Blog otherBlog = targetColog();
        Chapter chapter = Chapter.create(chapterBlog, "개발 이야기", 0);

        // when & then
        assertThatThrownBy(() -> chapter.validateAssignableTo(otherBlog))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("삭제된 챕터는 원래 블로그에도 할당할 수 없다.")
    void validateAssignableToRejectsDeletedChapter() {
        // given
        Blog blog = createColog(createUser(OWNER_ID));
        Chapter chapter = Chapter.create(blog, "개발 이야기", 0);
        chapter.delete();

        // when & then
        assertThatThrownBy(() -> chapter.validateAssignableTo(blog))
                .isInstanceOf(ChapterException.class)
                .hasMessage(CHAPTER_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("챕터 이름이 같으면 같은 이름으로 판단한다.")
    void isSameNameReturnsTrueForEqualName() {
        // given
        Chapter chapter = createChapter();
        ChapterName sameName = ChapterName.from("개발 이야기");

        // when & then
        assertThat(chapter.isSameName(sameName)).isTrue();
    }

    @Test
    @DisplayName("챕터 이름이 다르면 다른 이름으로 판단한다.")
    void isSameNameReturnsFalseForDifferentName() {
        // given
        Chapter chapter = createChapter();
        ChapterName differentName = ChapterName.from("다른 이야기");

        // when & then
        assertThat(chapter.isSameName(differentName)).isFalse();
    }

    private Chapter createChapter() {
        Blog blog = createColog(createUser(OWNER_ID));
        return Chapter.create(blog, "개발 이야기", 0);
    }

}
