package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.result.BlogMemberResult;
import kr.rilog.global.vo.Slug;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BlogMemberService {

    private final BlogRepository blogRepository;
    private final BlogMemberRepository blogMemberRepository;

    public List<BlogMemberResult> getCologMembers(String slug) {
        Blog colog = getColog(slug);

        return blogMemberRepository.findAllWithUserByBlogIdAndStatus(colog.getId(), BlogMemberStatus.ACTIVE).stream()
                .map(BlogMemberResult::from)
                .toList();
    }

    private Blog getColog(String slug) {
        return blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(slug), BlogType.COLOG)
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

}
