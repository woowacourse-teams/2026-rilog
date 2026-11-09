package kr.rilog.domain.chapter.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.entity.vo.ChapterName;
import kr.rilog.domain.chapter.entity.vo.ChaptersOfBlog;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.chapter.service.dto.command.ChapterCreateCommand;
import kr.rilog.domain.chapter.service.dto.command.ChapterRenameCommand;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;
import kr.rilog.domain.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_MEMBER_DOESNT_NOT_BELONG;

@Service
@Transactional
@RequiredArgsConstructor
public class ChapterCommandService {

    private final BlogMemberRepository blogMemberRepository;
    private final ChapterRepository chapterRepository;
    private final PostRepository postRepository;

    public ChapterResult create(String slug, Long requesterId, ChapterCreateCommand command) {
        BlogMember blogMember = getBlogMember(Slug.from(slug), requesterId);
        blogMember.validateAdminPermission();

        Blog blog = blogMember.getBlog();
        ChaptersOfBlog chapters = ChaptersOfBlog.from(getChaptersOfBlog(blog));
        Chapter saved = chapterRepository.save(chapters.createNextChapter(blog, command.name()));

        return ChapterResult.from(saved);
    }

    public ChapterResult rename(String slug, Long chapterId, Long requesterId, ChapterRenameCommand command) {
        BlogMember blogMember = getBlogMember(Slug.from(slug), requesterId);
        blogMember.validateAdminPermission();

        ChaptersOfBlog chapters = ChaptersOfBlog.from(getChaptersOfBlog(blogMember.getBlog()));
        Chapter chapter = chapters.rename(chapterId, ChapterName.from(command.name()));

        return ChapterResult.from(chapter);
    }

    public void delete(String slug, Long chapterId, Long requesterId) {
        BlogMember blogMember = getBlogMember(Slug.from(slug), requesterId);
        blogMember.validateAdminPermission();

        ChaptersOfBlog chapters = ChaptersOfBlog.from(getChaptersOfBlog(blogMember.getBlog()));

        chapters.delete(chapterId);
        postRepository.clearChapterByChapterId(chapterId);
    }

    private List<Chapter> getChaptersOfBlog(Blog blog) {
        return chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(blog.getId());
    }

    private BlogMember getBlogMember(Slug slug, Long memberId) {
        return blogMemberRepository.findWithBlogBySlugAndUserId(slug, memberId)
                .orElseThrow(() -> new BlogException(BLOG_MEMBER_DOESNT_NOT_BELONG));
    }

}
