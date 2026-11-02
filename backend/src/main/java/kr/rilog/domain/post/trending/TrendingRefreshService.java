package kr.rilog.domain.post.trending;

import kr.rilog.domain.post.repository.TrendingPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TrendingRefreshService {

    private final TrendingCandidateRepository candidateRepository;
    private final TrendingScorePolicy scorePolicy;
    private final TrendingPostRepository trendingPostRepository;

    public int refresh(LocalDateTime evaluatedAt) {
        List<TrendingScore> scores = new ArrayList<>();
        for (TrendingCandidate candidate : candidateRepository.findCandidates(evaluatedAt.minusMonths(2), evaluatedAt)) {
            BigDecimal score = scorePolicy.calculate(candidate, evaluatedAt).setScale(6, RoundingMode.HALF_UP);
            if (score.signum() < 0) {
                throw new IllegalArgumentException("트렌딩 점수는 음수일 수 없습니다.");
            }
            scores.add(new TrendingScore(candidate.postId(), score));
        }
        trendingPostRepository.replaceAll(scores, evaluatedAt);
        return scores.size();
    }
}
