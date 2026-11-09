package kr.rilog.domain.post.trending;

import kr.rilog.domain.post.repository.TrendingPostRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TrendingRefreshServiceTest {

    @Test
    @DisplayName("트렌딩 갱신은 평가 시각에서 두 달 전부터 후보를 가져와 점수를 저장한다.")
    void refreshUsesTwoCalendarMonths() {
        // given
        TrendingCandidateRepository candidates = mock(TrendingCandidateRepository.class);
        TrendingPostRepository posts = mock(TrendingPostRepository.class);
        TrendingScorePolicy scorePolicy = mock(TrendingScorePolicy.class);
        TrendingRefreshService service = new TrendingRefreshService(candidates, scorePolicy, posts);
        LocalDateTime evaluatedAt = LocalDateTime.of(2026, 4, 30, 12, 0);
        LocalDateTime from = LocalDateTime.of(2026, 2, 28, 12, 0);
        TrendingCandidate candidate = new TrendingCandidate(1L, from, 2L, 3L);
        when(candidates.findCandidates(from, evaluatedAt)).thenReturn(List.of(candidate));
        when(scorePolicy.calculate(candidate, evaluatedAt)).thenReturn(new BigDecimal("1.25"));

        // when
        int count = service.refresh(evaluatedAt);

        // then
        assertThat(count).isEqualTo(1);
        verify(posts).replaceAll(List.of(new TrendingScore(1L, new BigDecimal("1.250000"))), evaluatedAt);
    }
}
