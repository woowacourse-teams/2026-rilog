package kr.rilog.global.config;

import kr.rilog.global.logging.MdcTaskDecorator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.ThreadPoolExecutor;

@Slf4j
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    public static final String S3_TAGGING_EXECUTOR = "s3TaggingExecutor";
    private static final String ASYNC_UNCAUGHT_EXCEPTION_EVENT = "async_uncaught_exception";
    private static final String ASYNC_UNCAUGHT_EXCEPTION_LOG_FORMAT =
            "event=async_uncaught_exception method={}";

    public static final String NOTIFICATION_EXECUTOR = "notificationExecutor";
    private static final String NOTIFICATION_TASK_REJECTED_EVENT = "notification_task_rejected";
    private static final String NOTIFICATION_TASK_REJECTED_LOG_FORMAT =
            "event=notification_task_rejected queueSize={}";

    @Bean(name = S3_TAGGING_EXECUTOR)
    public ThreadPoolTaskExecutor s3TaggingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);

        executor.setThreadNamePrefix("s3-tagging-");
        executor.setTaskDecorator(new MdcTaskDecorator());

        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);

        executor.setRejectedExecutionHandler(
                new ThreadPoolExecutor.CallerRunsPolicy()
        );

        return executor;
    }

    @Bean(name = NOTIFICATION_EXECUTOR)
    public ThreadPoolTaskExecutor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(500);

        executor.setThreadNamePrefix("notification-");
        executor.setTaskDecorator(new MdcTaskDecorator());

        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);

        executor.setRejectedExecutionHandler((task, pool) ->
                log.atWarn()
                        .addKeyValue("event", NOTIFICATION_TASK_REJECTED_EVENT)
                        .addKeyValue("queueSize", pool.getQueue().size())
                        .log(NOTIFICATION_TASK_REJECTED_LOG_FORMAT, pool.getQueue().size())
        );

        return executor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (exception, method, params) ->
                log.atError()
                        .addKeyValue("event", ASYNC_UNCAUGHT_EXCEPTION_EVENT)
                        .addKeyValue("method", method.getName())
                        .setCause(exception)
                        .log(ASYNC_UNCAUGHT_EXCEPTION_LOG_FORMAT, method.getName());
    }
}
