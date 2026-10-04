package kr.rilog.domain.post.view;

import java.time.Duration;

public final class ViewPolicy {

    private static final long DUPLICATE_WINDOW_NANOS = Duration.ofHours(1).toNanos();

    public boolean canAccept(long lastAcceptedTick, long nowTick) {
        return nowTick - lastAcceptedTick >= DUPLICATE_WINDOW_NANOS;
    }
}
