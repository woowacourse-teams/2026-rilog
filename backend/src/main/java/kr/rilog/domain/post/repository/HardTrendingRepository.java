package kr.rilog.domain.post.repository;

import kr.rilog.domain.post.entity.HardTrending;
import org.springframework.data.repository.Repository;

public interface HardTrendingRepository extends Repository<HardTrending, Long> {

    HardTrending save(HardTrending hardTrending);
}
