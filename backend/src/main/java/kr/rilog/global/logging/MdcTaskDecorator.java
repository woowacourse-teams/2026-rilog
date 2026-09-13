package kr.rilog.global.logging;

import org.slf4j.MDC;
import org.springframework.core.task.TaskDecorator;

import java.util.Map;

public class MdcTaskDecorator implements TaskDecorator {

    @Override
    public Runnable decorate(Runnable runnable) {
        Map<String, String> submitterContext = MDC.getCopyOfContextMap();
        return () -> {
            Map<String, String> previousContext = MDC.getCopyOfContextMap();
            try {
                restore(submitterContext);
                runnable.run();
            } finally {
                restore(previousContext);
            }
        };
    }

    private void restore(Map<String, String> context) {
        if (context == null) {
            MDC.clear();
            return;
        }
        MDC.setContextMap(context);
    }
}
