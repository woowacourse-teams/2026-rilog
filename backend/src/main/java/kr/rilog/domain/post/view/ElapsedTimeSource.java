package kr.rilog.domain.post.view;

@FunctionalInterface
public interface ElapsedTimeSource {
    long readNanos();
}
