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
