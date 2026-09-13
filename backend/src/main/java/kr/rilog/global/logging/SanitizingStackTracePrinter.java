package kr.rilog.global.logging;

import org.springframework.boot.logging.StackTracePrinter;
import org.springframework.boot.logging.StandardStackTracePrinter;

import java.io.IOException;
import java.util.Objects;

public final class SanitizingStackTracePrinter implements StackTracePrinter {

    private final StackTracePrinter delegate;

    public SanitizingStackTracePrinter() {
        this(StandardStackTracePrinter.rootLast());
    }

    public SanitizingStackTracePrinter(StandardStackTracePrinter standardStackTracePrinter) {
        this.delegate = Objects.requireNonNull(standardStackTracePrinter, "standardStackTracePrinter")
                .withFormatter(SensitiveDataMasker::formatThrowable);
    }

    @Override
    public void printStackTrace(Throwable throwable, Appendable out) throws IOException {
        delegate.printStackTrace(throwable, out);
    }
}
