package kr.rilog.domain.post.trending;

import kr.rilog.domain.post.entity.TrendingPost;
import kr.rilog.domain.post.repository.TrendingPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.PriorityQueue;

@Service
@RequiredArgsConstructor
public class TrendingRefreshService {

    private final TrendingCandidateRepository candidateRepository;
    private final TrendingScorePolicy scorePolicy;
    private final TrendingPostRepository trendingPostRepository;

    public int refresh(LocalDateTime evaluatedAt) {
        PriorityQueue<TrendingRank> top = new PriorityQueue<>(TrendingRank.BEST_FIRST.reversed());
        for (TrendingCandidate candidate : candidateRepository.findCandidates(evaluatedAt.minusMonths(1), evaluatedAt)) {
            BigDecimal score = scorePolicy.calculate(candidate, evaluatedAt).setScale(6, RoundingMode.HALF_UP);
            if (score.signum() < 0) {
                throw new IllegalArgumentException("트렌딩 점수는 음수일 수 없습니다.");
            }
            top.add(new TrendingRank(candidate.postId(), candidate.publishedAt(), score));
            if (top.size() > TrendingPost.MAX_POSTS) top.poll();
        }
        var ranked = top.stream().sorted(TrendingRank.BEST_FIRST).toList();
        trendingPostRepository.replaceAll(ranked, evaluatedAt);
        return ranked.size();
    }
}
