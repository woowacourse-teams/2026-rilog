package kr.rilog.domain.post.view;

import java.time.Duration;

public final class ViewPolicy {

    static final Duration DUPLICATE_WINDOW = Duration.ofHours(1);
    private static final long DUPLICATE_WINDOW_NANOS = DUPLICATE_WINDOW.toNanos();

    public boolean canAccept(long lastAcceptedTick, long nowTick) {
        return nowTick - lastAcceptedTick >= DUPLICATE_WINDOW_NANOS;
    }
}
