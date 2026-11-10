package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CologQueryServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final String COLOG_SLUG = "rilog_team";

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    @Mock
    private ChapterRepository chapterRepository;

    private CologQueryService cologQueryService;

    @BeforeEach
    void setUp() {
        cologQueryService = new CologQueryService(blogRepository, blogMemberRepository, chapterRepository);
    }

    @Test
    @DisplayName("존재하지 않는 Colog는 멤버 목록 조회시 예외가 발생한다")
    void getCologMembersRejectsMissingColog() {
        // given
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG))
                .thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> cologQueryService.getCologMembers(COLOG_SLUG))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_NOT_FOUND);
    }

}
