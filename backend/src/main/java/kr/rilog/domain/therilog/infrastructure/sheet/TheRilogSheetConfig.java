package kr.rilog.domain.therilog.infrastructure.sheet;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestClient;

@Configuration
@EnableScheduling
@ConditionalOnProperty(prefix = "the-rilog", name = "enabled", havingValue = "true")
public class TheRilogSheetConfig {

    @Bean
    public RestClient googleSheetsTokenRestClient(TheRilogSheetProperties properties) {
        return restClient(properties);
    }

    @Bean
    public RestClient googleSheetsRestClient(TheRilogSheetProperties properties) {
        return restClient(properties);
    }

    @Bean
    public GoogleSheetsClient googleSheetsClient(
            RestClient googleSheetsTokenRestClient,
            RestClient googleSheetsRestClient,
            TheRilogSheetProperties properties,
            java.time.Clock clock
    ) {
        return new GoogleSheetsClient(googleSheetsTokenRestClient, googleSheetsRestClient, properties, clock);
    }

    private RestClient restClient(TheRilogSheetProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(properties.connectTimeout());
        requestFactory.setReadTimeout(properties.readTimeout());
        return RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }
}
