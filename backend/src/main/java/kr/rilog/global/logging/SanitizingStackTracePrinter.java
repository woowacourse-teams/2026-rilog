package kr.rilog.global.logging;

import org.springframework.boot.logging.StackTracePrinter;
import org.springframework.boot.logging.StandardStackTracePrinter;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.io.IOException;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Objects;
import java.util.Set;

public final class SanitizingStackTracePrinter implements StackTracePrinter {

    private final StandardStackTracePrinter delegate;

    public SanitizingStackTracePrinter() {
        this(StandardStackTracePrinter.rootLast());
    }

    public SanitizingStackTracePrinter(StandardStackTracePrinter standardStackTracePrinter) {
        this.delegate = Objects.requireNonNull(standardStackTracePrinter, "standardStackTracePrinter");
    }

    @Override
    public void printStackTrace(Throwable throwable, Appendable out) throws IOException {
        Set<Throwable> externalFailures = Collections.newSetFromMap(new IdentityHashMap<>());
        collectExternalFailures(throwable, false, Collections.newSetFromMap(new IdentityHashMap<>()), externalFailures);
        delegate.withFormatter(exception -> {
            if (externalFailures.contains(exception) && !(exception instanceof RestClientResponseException)) {
                return exception.getClass().getName();
            }
            return SensitiveDataMasker.formatThrowable(exception);
        }).printStackTrace(throwable, out);
    }

    private void collectExternalFailures(
            Throwable throwable, boolean externalBranch, Set<Throwable> visited, Set<Throwable> externalFailures
    ) {
        if (throwable == null) {
            return;
        }
        boolean external = externalBranch || throwable instanceof RestClientException;
        // Revisit shared causes when reached from an external branch; their messages may contain response data.
        Set<Throwable> seen = external ? externalFailures : visited;
        if (!seen.add(throwable)) {
            return;
        }
        collectExternalFailures(throwable.getCause(), external, visited, externalFailures);
        for (Throwable suppressed : throwable.getSuppressed()) {
            collectExternalFailures(suppressed, external, visited, externalFailures);
        }
    }
}
