package kr.rilog.domain.chapter.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
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
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;

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
        ChaptersOfBlog chapters = ChaptersOfBlog.from(getChaptersOfBlog(blog));
        Chapter saved = chapterRepository.save(chapters.createNextChapter(blog, command.name()));

        return ChapterResult.from(saved);
    }

    public List<ChapterResult> readAll(String slug) { // NOTE 모든 챕터목록을 불러옴. 페이징 X
        Blog blog = getBlog(slug);
        ChaptersOfBlog chapters = ChaptersOfBlog.from(getChaptersOfBlog(blog));
        return chapters.getChaptersSortByOrder();
    }

    @Transactional
    public ChapterResult rename(String slug, Long chapterId, Long requesterId, ChapterRenameCommand command) {
        BlogMember blogMember = getBlogMember(Slug.from(slug), requesterId);
        blogMember.validateHasAdminPermission();

        ChaptersOfBlog chapters = ChaptersOfBlog.from(getChaptersOfBlog(blogMember.getBlog()));
        Chapter chapter = chapters.rename(chapterId, ChapterName.from(command.name()));

        return ChapterResult.from(chapter);
    }

    @Transactional
    public void delete(String slug, Long chapterId, Long requesterId) {
        BlogMember blogMember = getBlogMember(Slug.from(slug), requesterId);
        blogMember.validateHasAdminPermission();

        ChaptersOfBlog chapters = ChaptersOfBlog.from(getChaptersOfBlog(blogMember.getBlog()));
        chapters.delete(chapterId);

        // TODO - 연관된 Post의 chapterId - null -> 벌크 업데이트
    }

    private List<Chapter> getChaptersOfBlog(Blog blog) {
        return chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(blog.getId());
    }

    private Blog getBlog(String slug) {
        return blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(slug))
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

    private BlogMember getBlogMember(Slug slug, Long memberId) {
        return blogMemberRepository.findWithBlogBySlugAndUserId(slug, memberId)
                .orElseThrow(() -> new BlogException(BLOG_MEMBER_DOESNT_NOT_BELONG));
    }

}
