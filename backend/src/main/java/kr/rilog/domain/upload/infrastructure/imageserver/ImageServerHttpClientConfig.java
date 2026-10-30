package kr.rilog.domain.upload.infrastructure.imageserver;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class ImageServerHttpClientConfig {

    @Bean
    public RestClient imageServerRestClient(ImageServerProperties properties) {
        return createRestClient(properties, properties.readTimeout());
    }

    // 압축은 이미지 서버 대기열에서 기다린 시간까지 응답에 포함되므로 가져오기와 다른 read timeout을 쓴다.
    @Bean
    public RestClient imageServerCompactionRestClient(ImageServerProperties properties) {
        return createRestClient(properties, properties.compactionReadTimeout());
    }

    private RestClient createRestClient(ImageServerProperties properties, Duration readTimeout) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(properties.connectTimeout());
        requestFactory.setReadTimeout(readTimeout);

        return RestClient.builder()
                .baseUrl(properties.baseUrl().toString())
                .requestFactory(requestFactory)
                .build();
    }

}
