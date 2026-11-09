package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.result.BlogIndexResult;
import kr.rilog.domain.blog.service.dto.result.BlogPublicProfileResult;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Email;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class BlogQueryServiceIntegrationTest extends ServiceSupport {

    @Autowired
    private BlogQueryService blogQueryService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Test
    @DisplayName("COLOG 인덱스는 공개 발행 게시글의 전체 개수와 챕터별 개수를 반환한다.")
    void readCologIndexReturnsTotalAndChapterPostCount() {
        // given
        User owner = userRepository.save(createCompletedUser(300L, "소유자", "colog_owner"));
        User member = userRepository.save(createCompletedUser(200L, "멤버", "member"));
        Blog rilog = blogRepository.save(Blog.createRilog(owner));
        Blog memberRilog = blogRepository.save(Blog.createRilog(member));
        Blog colog = blogRepository.saveAndFlush(createColog(owner, "team_b", "팀 B"));
        Chapter chapter = chapterRepository.saveAndFlush(Chapter.create(colog, "첫 번째 챕터", 0));

        postRepository.save(PostFixture.publicPublishedColog(rilog, colog, owner, chapter));
        postRepository.save(PostFixture.publicPublishedColog(memberRilog, colog, member));
        postRepository.save(PostFixture.privatePublishedCologPost(rilog, colog, owner, chapter));
        postRepository.save(PostFixture.publicDraftCologPost(rilog, colog, owner, chapter));
        postRepository.saveAndFlush(PostFixture.deletedPublicPublishedCologPost(rilog, colog, owner, chapter));

        // when
        BlogIndexResult result = blogQueryService.readBlogIndex("team_b");

        // then
        assertThat(result.totalCount()).isEqualTo(2L);
        assertThat(result.chapters())
                .extracting(
                        BlogIndexResult.ChapterIndexResult::chapterId,
                        BlogIndexResult.ChapterIndexResult::chapterName,
                        BlogIndexResult.ChapterIndexResult::postCount
                )
                .containsExactly(tuple(chapter.getId(), "첫 번째 챕터", 1L));
    }

    @Test
    @DisplayName("RILOG 인덱스는 개인·팀 블로그 공개 발행 글의 전체 개수와 챕터별 개수를 반환한다.")
    void readRilogIndexReturnsTotalAndOrderedChapterPostCounts() {
        // given
        User owner = userRepository.save(createCompletedUser(400L, "러로", "riro_index"));
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(owner));
        Blog colog = blogRepository.saveAndFlush(createColog(owner, "team_total", "집계 팀"));
        blogMemberRepository.saveAndFlush(BlogMember.createOwner(
                colog, owner, LocalDateTime.of(2026, 8, 1, 12, 0)
        ));
        Chapter firstChapter = chapterRepository.save(Chapter.create(rilog, "Java", 0));
        Chapter secondChapter = chapterRepository.saveAndFlush(Chapter.create(rilog, "회고", 1));

        postRepository.save(PostFixture.publicPublishedRilogPost(rilog, owner, firstChapter)); // PUBLIC
        postRepository.save(PostFixture.publicPublishedRilogPost(rilog, owner, firstChapter)); // PUBLIC
        postRepository.save(PostFixture.publicPublishedColog(rilog, colog, owner));
        postRepository.save(PostFixture.privatePublishedRilogPost(rilog, owner, firstChapter)); //  PRIVATE
        postRepository.save(PostFixture.publicDraftRilogPost(rilog, owner, firstChapter)); // DRAFT
        postRepository.save(PostFixture.deletedPublicPublishedRilogPost(rilog, owner, firstChapter)); // DELETED
        postRepository.save(PostFixture.publicDraftCologPost(rilog, colog, owner));
        postRepository.saveAndFlush(PostFixture.deletedPublicPublishedCologPost(rilog, colog, owner));

        // when
        BlogIndexResult result = blogQueryService.readBlogIndex("riro_index");

        // then
        assertThat(result.totalCount()).isEqualTo(3L);
        assertThat(result.cologs())
                .extracting(
                        BlogIndexResult.CologIndexResult::cologId,
                        BlogIndexResult.CologIndexResult::cologName,
                        BlogIndexResult.CologIndexResult::cologSlug,
                        BlogIndexResult.CologIndexResult::cologProfileImageUrl,
                        BlogIndexResult.CologIndexResult::authoredPostCount
                )
                .containsExactly(tuple(colog.getId(), "집계 팀", "team_total", "https://example.com/profile.png", 1L));
        assertThat(result.chapters())
                .extracting(
                        BlogIndexResult.ChapterIndexResult::chapterId,
                        BlogIndexResult.ChapterIndexResult::chapterName,
                        BlogIndexResult.ChapterIndexResult::postCount
                )
                .containsExactly(
                        tuple(firstChapter.getId(), "Java", 2L),
                        tuple(secondChapter.getId(), "회고", 0L)
                );
    }

    @Test
    @DisplayName("팀 slug로 저장된 Colog의 공개 프로필 정보를 조회한다")
    void getPublicProfileFindsCologBySlug() {
        // given
        User owner = userRepository.save(createCompletedUser(300L, "소유자", "colog_owner"));
        Blog colog = blogRepository.saveAndFlush(createColog(owner, "team_rilog", "리로그"));

        // when
        BlogPublicProfileResult result = blogQueryService.getPublicProfile("team_Rilog");

        // then
        assertThat(result).isEqualTo(new BlogPublicProfileResult(
                BlogType.COLOG,
                colog.getId(),
                "리로그",
                "team_rilog",
                "팀 소개",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog"
        ));
    }

    private Blog createColog(User owner, String slug, String name) {
        return Blog.createColog(
                owner,
                slug,
                Profile.createColog(
                        name,
                        "팀 소개",
                        "https://example.com/profile.png",
                        "https://example.com/cover.png",
                        "https://rilog.example.com",
                        "https://github.com/rilog",
                        "test@test.com"
                )
        );
    }

    private User createCompletedUser(Long githubId, String nickname, String slug) {
        return User.builder()
                .githubId(githubId)
                .nickname(Nickname.from(nickname))
                .slug(Slug.from(slug))
                .introduction("기록하는 개발자입니다.")
                .profileImageUrl("https://example.com/profile.png")
                .githubUrl("https://github.com/%s".formatted(slug))
                .email(Email.from("%s@example.com".formatted(slug)))
                .build();
    }

}
