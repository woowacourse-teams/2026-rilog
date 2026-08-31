package kr.rilog.domain.blog.service.dto.result;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.entity.vo.ChapterName;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static kr.rilog.support.fixure.BlogFixture.createColog;
import static kr.rilog.support.fixure.BlogFixture.createUser;
import static kr.rilog.support.fixure.BlogFixture.targetColog;
import static org.assertj.core.api.Assertions.assertThat;

class CologOverviewTest {

    @Test
    @DisplayName("팀 목록과 챕터 목록을 팀별 챕터 목록으로 묶는다.")
    void groupMatchesChaptersToEachColog() {
        // given
        User owner = createUser(1L);
        Blog firstColog = createColog(owner);
        Blog secondColog = targetColog();
        Chapter firstChapter = createChapter(1L, firstColog, "Spring", 0);
        Chapter secondChapter = createChapter(2L, firstColog, "JPA", 1);
        Chapter thirdChapter = createChapter(3L, secondColog, "React", 0);

        // when
        List<CologOverview> result = CologOverview.group(
                List.of(firstColog, secondColog),
                List.of(firstChapter, secondChapter, thirdChapter)
        );

        // then
        assertThat(result).containsExactly(
                new CologOverview(firstColog, List.of(firstChapter, secondChapter)),
                new CologOverview(secondColog, List.of(thirdChapter))
        );
    }

    @Test
    @DisplayName("챕터가 없는 팀은 빈 챕터 목록으로 묶는다.")
    void groupUsesEmptyChaptersWhenCologHasNoChapter() {
        // given
        Blog colog = createColog(createUser(1L));

        // when
        List<CologOverview> result = CologOverview.group(List.of(colog), List.of());

        // then
        assertThat(result).containsExactly(new CologOverview(colog, List.of()));
    }

    private Chapter createChapter(Long id, Blog blog, String name, int order) {
        return Chapter.builder()
                .id(id)
                .blog(blog)
                .name(ChapterName.from(name))
                .order(order)
                .build();
    }

}
