package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.BlogProfileUpdateCommand;
import kr.rilog.domain.blog.service.dto.result.BlogIndexResult;
import kr.rilog.domain.blog.service.dto.result.BlogPublicProfileResult;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.vo.Email;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_PROFILE_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BlogServiceIntegrationTest extends ServiceSupport {

    @Autowired
    private BlogService blogService;

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
    @DisplayName("COLOG 인덱스는 블로그 유형과 공개 발행 게시글의 전체 개수를 반환한다.")
    void readBlogIndexReturnsCologTypeAndTotalPublicPublishedPostCount() {
        // given
        User owner = userRepository.save(createCompletedUser(100L, "소유자", "owner"));
        User member = userRepository.save(createCompletedUser(200L, "멤버", "member"));
        Blog ownerRilog = blogRepository.save(Blog.createRilog(owner));
        Blog memberRilog = blogRepository.save(Blog.createRilog(member));
        Blog colog = blogRepository.saveAndFlush(createColog(owner, "team-a", "팀 A"));

        postRepository.save(PostFixture.publicPublishedColog(ownerRilog, colog, owner)); // PUBLIC
        postRepository.save(PostFixture.publicPublishedColog(memberRilog, colog, member)); // PUBLIC
        postRepository.save(PostFixture.privatePublishedCologPost(ownerRilog, colog, owner)); // PRIVATE
        postRepository.save(PostFixture.publicDraftCologPost(ownerRilog, colog, owner)); // DRAFT
        postRepository.saveAndFlush(PostFixture.deletedPublicPublishedCologPost(ownerRilog, colog, owner));

        // when
        BlogIndexResult result = blogService.readBlogIndex("team-a");

        // then
        assertThat(result.blogType()).isEqualTo(BlogType.COLOG);
        assertThat(result.totalCount()).isEqualTo(2L);
        assertThat(result.cologs()).isNull();
    }

    @Test
    @DisplayName("COLOG 인덱스는 모든 챕터와 챕터별 공개 발행 게시글 수를 챕터 순서대로 반환한다.")
    void readBlogIndexReturnsOrderedCologChapterIndexes() {
        // given
        User owner = userRepository.save(createCompletedUser(300L, "소유자", "colog-owner"));
        Blog rilog = blogRepository.save(Blog.createRilog(owner));
        Blog colog = blogRepository.saveAndFlush(createColog(owner, "team-b", "팀 B"));
        Chapter firstChapter = chapterRepository.save(Chapter.create(colog, "첫 번째 챕터", 0));
        Chapter secondChapter = chapterRepository.save(Chapter.create(colog, "두 번째 챕터", 1));
        Chapter emptyChapter = chapterRepository.saveAndFlush(Chapter.create(colog, "빈 챕터", 2));

        postRepository.save(PostFixture.publicPublishedColog(rilog, colog, owner, firstChapter));
        postRepository.save(PostFixture.publicPublishedColog(rilog, colog, owner, firstChapter));
        postRepository.save(PostFixture.publicPublishedColog(rilog, colog, owner, secondChapter));
        postRepository.save(PostFixture.privatePublishedCologPost(rilog, colog, owner, firstChapter));
        postRepository.save(PostFixture.publicDraftCologPost(rilog, colog, owner, firstChapter));
        postRepository.saveAndFlush(PostFixture.deletedPublicPublishedCologPost(rilog, colog, owner, firstChapter));

        // when
        BlogIndexResult result = blogService.readBlogIndex("team-b");

        // then
        assertThat(result.chapters()).containsExactly(
                new BlogIndexResult.ChapterIndexResult(firstChapter.getId(), "첫 번째 챕터", 2L),
                new BlogIndexResult.ChapterIndexResult(secondChapter.getId(), "두 번째 챕터", 1L),
                new BlogIndexResult.ChapterIndexResult(emptyChapter.getId(), "빈 챕터", 0L)
        );
    }

    @Test
    @DisplayName("RILOG 인덱스는 모든 챕터와 챕터별 공개 발행 게시글 수를 챕터 순서대로 반환한다.")
    void readBlogIndexReturnsOrderedRilogChapterIndexes() {
        // given
        User owner = userRepository.save(createCompletedUser(400L, "러로", "riro-index"));
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(owner));
        Chapter firstChapter = chapterRepository.save(Chapter.create(rilog, "Java", 0));
        Chapter secondChapter = chapterRepository.saveAndFlush(Chapter.create(rilog, "회고", 1));

        postRepository.save(PostFixture.publicPublishedRilogPost(rilog, owner, firstChapter)); // PUBLIC
        postRepository.save(PostFixture.publicPublishedRilogPost(rilog, owner, firstChapter)); // PUBLIC
        postRepository.save(PostFixture.privatePublishedRilogPost(rilog, owner, firstChapter)); //  PRIVATE
        postRepository.save(PostFixture.publicDraftRilogPost(rilog, owner, firstChapter)); // DRAFT
        postRepository.saveAndFlush(PostFixture.deletedPublicPublishedRilogPost(rilog, owner, firstChapter)); // DELETED

        // when
        BlogIndexResult result = blogService.readBlogIndex("riro-index");

        // then
        assertThat(result.chapters()).containsExactly(
                new BlogIndexResult.ChapterIndexResult(firstChapter.getId(), "Java", 2L),
                new BlogIndexResult.ChapterIndexResult(secondChapter.getId(), "회고", 0L)
        );
    }

    @Test
    @DisplayName("RILOG 인덱스는 사용자가 속한 모든 활성 COLOG와 사용자의 공개 발행 게시글 수를 반환한다.")
    void readBlogIndexReturnsActiveCologIndexesWithAuthoredPostCount() {
        // given
        User owner = userRepository.save(createCompletedUser(500L, "러로", "riro-teams"));
        User otherUser = userRepository.save(createCompletedUser(600L, "다른 사용자", "other-user"));
        Blog rilog = blogRepository.save(Blog.createRilog(owner));
        Blog otherRilog = blogRepository.save(Blog.createRilog(otherUser));
        Blog firstColog = blogRepository.save(createColog(otherUser, "first-team", "첫 번째 팀"));
        Blog secondColog = blogRepository.save(createColog(otherUser, "second-team", "두 번째 팀"));
        Blog emptyColog = blogRepository.save(createColog(otherUser, "empty-team", "빈 팀"));
        Blog leftColog = blogRepository.saveAndFlush(createColog(otherUser, "left-team", "탈퇴한 팀"));

        blogMemberRepository.save(BlogMember.invite(
                firstColog, owner, "Backend", BlogPermission.MEMBER, LocalDateTime.of(2026, 8, 1, 12, 0)
        ));
        blogMemberRepository.save(BlogMember.invite(
                secondColog, owner, "Backend", BlogPermission.MEMBER, LocalDateTime.of(2026, 8, 2, 12, 0)
        ));
        blogMemberRepository.save(BlogMember.invite(
                emptyColog, owner, "Backend", BlogPermission.MEMBER, LocalDateTime.of(2026, 8, 3, 12, 0)
        ));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.leftMember(leftColog, owner));

        postRepository.save(PostFixture.publicPublishedColog(rilog, firstColog, owner));
        postRepository.save(PostFixture.publicPublishedColog(rilog, firstColog, owner));
        postRepository.save(PostFixture.publicPublishedColog(rilog, secondColog, owner));
        postRepository.save(PostFixture.publicPublishedColog(otherRilog, firstColog, otherUser));
        postRepository.save(PostFixture.privatePublishedCologPost(rilog, firstColog, owner));
        postRepository.save(PostFixture.publicDraftCologPost(rilog, firstColog, owner));
        postRepository.saveAndFlush(PostFixture.deletedPublicPublishedCologPost(rilog, firstColog, owner));

        // when
        BlogIndexResult result = blogService.readBlogIndex("riro-teams");

        // then
        assertThat(result.cologs()).containsExactlyInAnyOrder(
                new BlogIndexResult.CologIndexResult(emptyColog.getId(), "빈 팀", 0L),
                new BlogIndexResult.CologIndexResult(secondColog.getId(), "두 번째 팀", 1L),
                new BlogIndexResult.CologIndexResult(firstColog.getId(), "첫 번째 팀", 2L)
        );
    }

    @Test
    @DisplayName("RILOG 인덱스는 개인 블로그와 COLOG에 작성한 공개 발행 게시글의 전체 개수를 반환한다.")
    void readBlogIndexReturnsTotalPublicPublishedPostCountAuthoredByRilogUser() {
        // given
        User owner = userRepository.save(createCompletedUser(700L, "러로", "riro-total"));
        Blog rilog = blogRepository.save(Blog.createRilog(owner));
        Blog colog = blogRepository.saveAndFlush(createColog(owner, "team-total", "집계 팀"));
        blogMemberRepository.saveAndFlush(BlogMember.createOwner(
                colog, owner, LocalDateTime.of(2026, 8, 1, 12, 0)
        ));

        postRepository.save(PostFixture.publicPublishedRilogPost(rilog, owner)); // RILOG - PUBLIC
        postRepository.save(PostFixture.publicPublishedColog(rilog, colog, owner)); // PUBLIC - COLOG
        postRepository.save(PostFixture.privatePublishedRilogPost(rilog, owner)); // PRIVATE
        postRepository.save(PostFixture.publicDraftCologPost(rilog, colog, owner)); // DRAFT
        postRepository.saveAndFlush(PostFixture.deletedPublicPublishedCologPost(rilog, colog, owner)); // DELETED

        // when
        BlogIndexResult result = blogService.readBlogIndex("riro-total");

        // then
        assertThat(result.blogType()).isEqualTo(BlogType.RILOG);
        assertThat(result.totalCount()).isEqualTo(2L);
    }

    @Test
    @DisplayName("활성 블로그의 slug와 중복되면 예외가 발생한다")
    void validateDuplicatedSlugThrowsWhenActiveBlogHasSlug() {
        // given
        User owner = userRepository.save(User.createPendingGithubUser(100L, "owner", "https://example.com/owner.png"));
        blogRepository.saveAndFlush(createColog(owner, "team-a", "리로그 팀"));

        // when - then
        assertThatThrownBy(() -> blogService.validateDuplicatedSlug("team-a"))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_SLUG_ALREADY_EXISTS.getMessage());
    }

    @Test
    @DisplayName("활성 블로그의 프로필 이름과 중복되면 예외가 발생한다")
    void validateDuplicatedProfileNameThrowsWhenActiveBlogHasProfileName() {
        // given
        User owner = userRepository.save(User.createPendingGithubUser(100L, "owner", "https://example.com/owner.png"));
        blogRepository.saveAndFlush(createColog(owner, "team-a", "리로그 팀"));

        // when - then
        assertThatThrownBy(() -> blogService.validateDuplicatedProfileName("리로그 팀"))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_PROFILE_NAME_ALREADY_EXISTS.getMessage());
    }

    @Test
    @DisplayName("삭제된 블로그의 프로필 이름은 중복 검사에서 제외한다")
    void validateDuplicatedProfileNameIgnoresDeletedBlogProfileName() {
        // given
        User owner = userRepository.save(User.createPendingGithubUser(100L, "owner", "https://example.com/owner.png"));
        Blog deletedColog = blogRepository.saveAndFlush(createColog(owner, "team-a", "리로그 팀"));
        deletedColog.delete();
        blogRepository.saveAndFlush(deletedColog);

        // when - then
        assertThatCode(() -> blogService.validateDuplicatedProfileName("리로그 팀"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("ADMIN이 COLOG 프로필을 변경하면 변경된 프로필이 저장된다.")
    void changeBlogProfilePersistsChangedCologProfile() {
        // given
        User owner = userRepository.save(User.createPendingGithubUser(100L, "owner", "https://example.com/owner.png"));
        User admin = userRepository.save(User.createPendingGithubUser(200L, "admin", "https://example.com/admin.png"));
        Blog colog = blogRepository.save(createColog(owner, "team-a", "리로그 팀"));
        blogMemberRepository.saveAndFlush(
                BlogMember.invite(
                        colog,
                        admin,
                        "Backend",
                        BlogPermission.ADMIN,
                        LocalDateTime.now()
                )
        );
        BlogProfileUpdateCommand command = new BlogProfileUpdateCommand(
                "https://example.com/new-profile.png",
                "https://example.com/new-cover.png",
                "새 리로그 팀",
                "새 팀 소개",
                "https://new-rilog.example.com",
                "https://github.com/new-rilog",
                "new-rilog@example.com"
        );
        Profile expectedProfile = command.toProfile();

        // when
        blogService.changeBlogProfile(admin.getId(), "team-a", command);

        // then
        Blog savedColog = blogRepository.findById(colog.getId()).orElseThrow();
        assertThat(savedColog.getProfile())
                .usingRecursiveComparison()
                .isEqualTo(expectedProfile);
    }

    @Test
    @DisplayName("개인 slug로 공개 프로필을 조회하면 RILOG 프로필과 공개 게시글 수를 반환한다.")
    void getPublicProfileReturnsRilogProfile() {
        // given
        User owner = userRepository.save(createCompletedUser(300L, "러로", "riro"));
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(owner, "https://rilog.example.com"));
        Blog colog = blogRepository.saveAndFlush(createColog(owner, "team-a", "리로그 팀"));
        postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, owner));
        postRepository.saveAndFlush(PostFixture.privatePublishedRilogPost(rilog, owner));
        postRepository.saveAndFlush(PostFixture.publicPublishedColog(rilog, colog, owner));

        // when
        BlogPublicProfileResult result = blogService.getPublicProfile("riro");

        // then
        assertThat(result)
                .extracting(
                        BlogPublicProfileResult::type,
                        BlogPublicProfileResult::name,
                        BlogPublicProfileResult::slug,
                        BlogPublicProfileResult::memberCount,
                        BlogPublicProfileResult::postCount
                )
                .containsExactly(
                        BlogType.RILOG,
                        "러로",
                        "riro",
                        1L,
                        1L
                );
    }

    @Test
    @DisplayName("RILOG 프로필을 변경하면 개인 블로그와 소유자 프로필 정보가 함께 변경된다.")
    void changeBlogProfilePersistsChangedRilogProfileAndOwnerProfile() {
        // given
        User owner = userRepository.save(createCompletedUser(400L, "러로", "riro"));
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(owner, "https://rilog.example.com"));
        BlogProfileUpdateCommand command = new BlogProfileUpdateCommand(
                "https://example.com/new-profile.png",
                null,
                "새 개인 블로그",
                "새 소개",
                "https://new-rilog.example.com",
                "https://github.com/new-rilog",
                "new-rilog@example.com"
        );

        // when
        blogService.changeBlogProfile(owner.getId(), "riro", command);

        // then
        Blog savedRilog = blogRepository.findById(rilog.getId()).orElseThrow();
        User savedOwner = userRepository.findById(owner.getId()).orElseThrow();

        assertThat(savedRilog)
                .extracting(
                        Blog::getName,
                        Blog::getIntroduction,
                        Blog::getProfileImageUrl,
                        Blog::getServiceUrl,
                        Blog::getGithubUrl,
                        Blog::getEmail
                )
                .containsExactly(
                        "새 개인 블로그",
                        "새 소개",
                        "https://example.com/new-profile.png",
                        "https://new-rilog.example.com",
                        "https://github.com/new-rilog",
                        "new-rilog@example.com"
                );
        assertThat(savedOwner)
                .extracting(
                        User::getNickname,
                        User::getIntroduction,
                        User::getProfileImageUrl,
                        User::getGithubUrl,
                        User::getEmail
                )
                .containsExactly(
                        "새 개인 블로그",
                        "새 소개",
                        "https://example.com/new-profile.png",
                        "https://github.com/new-rilog",
                        "new-rilog@example.com"
                );
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
