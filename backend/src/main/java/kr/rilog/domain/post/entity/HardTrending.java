package kr.rilog.domain.post.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Immutable;

@Getter
@Entity
@Table(
        name = "hard_trending",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_hard_trending_post_id",
                columnNames = "post_id"
        )
)
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HardTrending {

    @Id
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;
}
