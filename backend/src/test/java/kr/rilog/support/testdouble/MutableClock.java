package kr.rilog.support.testdouble;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * 공유 컨텍스트에서 시각이 필요한 테스트만 고정하고, 나머지 테스트는 시스템 시각을 사용하도록 하는 Clock.
 */
public class MutableClock extends Clock {

    private static final Clock SYSTEM = Clock.systemUTC();

    private volatile Clock delegate = SYSTEM;

    public void fix(Instant instant) {
        delegate = Clock.fixed(instant, ZoneOffset.UTC);
    }

    public void reset() {
        delegate = SYSTEM;
    }

    @Override
    public ZoneId getZone() {
        return delegate.getZone();
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return delegate.withZone(zone);
    }

    @Override
    public Instant instant() {
        return delegate.instant();
    }

}
