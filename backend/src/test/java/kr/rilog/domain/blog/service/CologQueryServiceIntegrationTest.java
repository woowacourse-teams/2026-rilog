package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.result.BlogMemberResult;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class CologQueryServiceIntegrationTest extends ServiceSupport {

    private static final String COLOG_SLUG = "rilog_team";
    private static final LocalDateTime JOINED_AT = LocalDateTime.of(2026, 8, 13, 12, 0);

    @Autowired
    private CologQueryService cologQueryService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private ChapterRepository chapterRepository;

    @Test
    @DisplayName("팀 slug로 조회하면 해당 팀의 활성 멤버만 반환한다")
    void getCologMembersReturnsActiveMembers() {
        // given
        User owner = saveUser(100L, "리로", "owner_rilog");
        User member = saveUser(200L, "포비", "member_rilog");
        User formerMember = saveUser(300L, "탈퇴자", "former_rilog");
        Blog colog = blogRepository.save(BlogFixture.createPersistableColog(owner, COLOG_SLUG));
        BlogMember ownerMembership = blogMemberRepository.save(BlogMember.createOwner(colog, owner, JOINED_AT));
        BlogMember membership = blogMemberRepository.save(
                BlogMember.invite(colog, member, "Frontend", BlogPermission.MEMBER, JOINED_AT)
        );
        saveLeftMembership(colog, formerMember);

        // when
        List<BlogMemberResult> result = cologQueryService.getCologMembers(COLOG_SLUG);

        // then
        assertThat(result)
                .extracting(BlogMemberResult::id, BlogMemberResult::userId, BlogMemberResult::permission)
                .containsExactlyInAnyOrder(
                        tuple(ownerMembership.getId(), owner.getId(), BlogPermission.OWNER),
                        tuple(membership.getId(), member.getId(), BlogPermission.MEMBER)
                );
    }

    @Test
    @DisplayName("Colog 멤버 목록은 영문과 한글 닉네임을 오름차순으로 반환한다")
    void getCologMembersReturnsMembersSortedByKoreanAndEnglishNickname() {
        // given
        User owner = saveUser(100L, "라마바", "owner_rilog");
        User korean = saveUser(200L, "가나다", "korean_rilog");
        User bravo = saveUser(300L, "bravo", "bravo_rilog");
        User alpha = saveUser(400L, "alpha", "alpha_rilog");
        Blog colog = blogRepository.save(BlogFixture.createPersistableColog(owner, COLOG_SLUG));
        blogMemberRepository.saveAll(List.of(
                BlogMember.createOwner(colog, owner, JOINED_AT),
                BlogMember.invite(colog, korean, "Backend", BlogPermission.MEMBER, JOINED_AT.plusMinutes(1)),
                BlogMember.invite(colog, bravo, "Backend", BlogPermission.MEMBER, JOINED_AT.plusMinutes(2)),
                BlogMember.invite(colog, alpha, "Backend", BlogPermission.MEMBER, JOINED_AT.plusMinutes(3))
        ));

        // when
        List<BlogMemberResult> results = cologQueryService.getCologMembers(COLOG_SLUG);

        // then
        assertThat(results)
                .extracting(BlogMemberResult::nickname)
                .containsExactly("alpha", "bravo", "가나다", "라마바");
    }

    @Test
    @DisplayName("나의 팀 목록에는 요청자가 활동 중인 팀과 해당 팀의 챕터가 나온다")
    void getMyCologsOverviewFindsActiveCologsAndChaptersByRequesterId() {
        // given
        User requester = saveUser(100L, "요청자", "requester");
        User otherOwner = saveUser(200L, "다른 소유자", "other_owner");
        Blog colog = blogRepository.save(BlogFixture.createPersistableColog(requester, COLOG_SLUG));
        Blog formerColog = blogRepository.save(BlogFixture.createPersistableColog(otherOwner, "other_team"));
        blogMemberRepository.save(BlogMember.createOwner(colog, requester, JOINED_AT));
        blogMemberRepository.save(BlogMember.createOwner(formerColog, otherOwner, JOINED_AT));
        saveLeftMembership(formerColog, requester);
        Chapter chapter = chapterRepository.save(Chapter.create(colog, "Spring", 0));
        chapterRepository.save(Chapter.create(formerColog, "다른 팀 챕터", 0));

        // when
        List<MyCologResponse> result = cologQueryService.getMyCologsOverview(requester.getId());

        // then
        assertThat(result)
                .extracting(MyCologResponse::cologId, MyCologResponse::chapters)
                .containsExactly(tuple(colog.getId(), List.of(new ChapterResponse(chapter.getId(), "Spring", 0))));
    }

    @Test
    @DisplayName("활동 중인 팀이 없는 사용자의 팀 목록은 비어 있다")
    void getMyCologsOverviewReturnsEmptyListWhenUserHasNoCologs() {
        // given
        User requester = saveUser(100L, "요청자", "requester");

        // when
        List<MyCologResponse> result = cologQueryService.getMyCologsOverview(requester.getId());

        // then
        assertThat(result).isEmpty();
    }

    private User saveUser(long githubId, String nickname, String slug) {
        return userRepository.save(User.builder()
                .githubId(githubId)
                .nickname(Nickname.from(nickname))
                .slug(Slug.from(slug))
                .build());
    }

    private void saveLeftMembership(Blog colog, User user) {
        BlogMember membership = BlogMember.invite(colog, user, "Backend", BlogPermission.MEMBER, JOINED_AT);
        membership.leaveBySelf();
        blogMemberRepository.save(membership);
    }

}
