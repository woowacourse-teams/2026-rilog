package kr.rilog.domain.chapter.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.entity.vo.ChaptersOfBlog;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.chapter.service.dto.command.ChapterCreateCommand;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;
import kr.rilog.domain.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_DOESNT_NOT_BELONG;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ChapterService {

    private final BlogRepository blogRepository;
    private final BlogMemberRepository blogMemberRepository;
    private final ChapterRepository chapterRepository;
    private final PostRepository postRepository;

    @Transactional
    public ChapterResult create(String slug, Long requesterId, ChapterCreateCommand command) {
        BlogMember blogMember = getBlogMember(Slug.from(slug), requesterId);
        blogMember.validateHasAdminPermission();

        Blog blog = blogMember.getBlog();
        ChaptersOfBlog chaptersOfBlog = ChaptersOfBlog.from(getChaptersOfBlog(blog));
        Chapter saved = chapterRepository.save(chaptersOfBlog.createNextChapter(blog, command.name()));

        return ChapterResult.from(saved);
    }

    private List<Chapter> getChaptersOfBlog(Blog blog) {
        return chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(blog.getId());
    }

    private BlogMember getBlogMember(Slug slug, Long memberId) {
        return blogMemberRepository.findWithBlogBySlugAndUserId(slug, memberId)
                .orElseThrow(() -> new BlogException(BLOG_MEMBER_DOESNT_NOT_BELONG));
    }

}
