package kr.rilog.domain.therilog.service;

import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostSource;
import kr.rilog.domain.therilog.repository.TheRilogRepository;
import kr.rilog.domain.therilog.repository.projection.TheRilogSpotlightRow;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult.HeadlineResult;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult.NewsResult;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult.SourceResult;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult.SpotlightResult;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Stream;

import static kr.rilog.domain.post.entity.Post.THE_RILOG_BLOG_SLUG;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class TheRilogQueryService {

    private static final int ENTERPRISE_SPOTLIGHT_SIZE = 3;
    private static final int PERSONAL_SPOTLIGHT_SIZE = 2;

    private final TheRilogRepository theRilogRepository;

    public TheRilogResult readTheRilog() {
        NewsResult news = readLatestPublicNews();
        List<SpotlightResult> spotlights = readSpotlights();
        return new TheRilogResult(THE_RILOG_BLOG_SLUG, readDate(news, spotlights), news, spotlights);
    }

    private NewsResult readLatestPublicNews() {
        return theRilogRepository.findLatestPublicNews(Slug.from(THE_RILOG_BLOG_SLUG), PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(this::toNewsResult)
                .orElse(null);
    }

    private List<SpotlightResult> readSpotlights() {
        List<TheRilogSpotlightRow> enterpriseSpotlights = theRilogRepository.findLatestPublicSpotlights(
                Slug.from(THE_RILOG_BLOG_SLUG),
                PostType.ENTERPRISE_SPOTLIGHT,
                PageRequest.of(0, ENTERPRISE_SPOTLIGHT_SIZE)
        );
        List<TheRilogSpotlightRow> personalSpotlights = theRilogRepository.findLatestPublicSpotlights(
                Slug.from(THE_RILOG_BLOG_SLUG),
                PostType.PERSONAL_SPOTLIGHT,
                PageRequest.of(0, PERSONAL_SPOTLIGHT_SIZE)
        );

        return Stream.concat(enterpriseSpotlights.stream(), personalSpotlights.stream())
                .map(this::toSpotlightResult)
                .toList();
    }

    private NewsResult toNewsResult(Post post) {
        List<HeadlineResult> headlines = post.getContent()
                .extractHeadingBlocks()
                .stream()
                .filter(block -> !block.text().isBlank())
                .map(block -> new HeadlineResult(block.text()))
                .toList();
        return new NewsResult(post.getId(), post.getTitle(), post.getPublishedAt(), headlines);
    }

    private LocalDate readDate(NewsResult news, List<SpotlightResult> spotlights) {
        if (news != null && news.publishedAt() != null) {
            return news.publishedAt().toLocalDate();
        }
        return spotlights.stream()
                .map(SpotlightResult::publishedAt)
                .max(LocalDateTime::compareTo)
                .map(java.time.LocalDateTime::toLocalDate)
                .orElse(null);
    }

    private SpotlightResult toSpotlightResult(TheRilogSpotlightRow row) {
        return new SpotlightResult(
                row.postId(),
                row.postType(),
                row.title(),
                row.description(),
                row.thumbnailImageUrl(),
                row.publishedAt(),
                toSourceResult(row.source())
        );
    }

    private SourceResult toSourceResult(PostSource source) {
        if (source == null) {
            return null;
        }
        return new SourceResult(source.getSourceProfileName(), source.getSourceProfileImage());
    }
}
