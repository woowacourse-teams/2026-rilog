package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.result.CologPublicProfileResult;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.global.vo.Slug;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;

@Service
@RequiredArgsConstructor
public class BlogService {

    private final BlogRepository blogRepository;
    private final BlogMemberRepository blogMemberRepository;
    private final PostRepository postRepository;

    public CologPublicProfileResult getPublicProfile(String slug) {
        Blog colog = blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(slug), BlogType.COLOG)
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));

        long memberCount = blogMemberRepository.countActiveMembersByBlogId(colog.getId());
        long postCount = postRepository.countPublicPublishedPostsByCologId(colog.getId());
        return CologPublicProfileResult.from(colog, memberCount, postCount);
    }

    public List<MyCologResponse> getMyCologsPreview(Long requesterId) {
        return blogRepository.findAllActiveCologsByUserId(requesterId).stream()
                .map(MyCologResponse::of)
                .toList();
    }

}
