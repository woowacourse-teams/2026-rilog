package kr.rilog.auth;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.HttpHeaders.LOCATION;
import static org.springframework.http.HttpHeaders.SET_COOKIE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.util.concurrent.atomic.AtomicReference;
import kr.rilog.global.auth.annotation.LoginRequired;
import kr.rilog.global.auth.annotation.LoginUserId;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(
        properties = "spring.jpa.hibernate.ddl-auto=create-drop",
        webEnvironment = SpringBootTest.WebEnvironment.MOCK
)
@AutoConfigureMockMvc
@Import(AuthVerticalFlowTest.TestInfrastructure.class)
class AuthVerticalFlowTest {

    private static final String FRONTEND_ORIGIN = "https://rilog.test";
    private static final AtomicReference<String> TOKEN_REQUEST_BODY = new AtomicReference<>();
    private static final HttpServer GITHUB = startGithubServer();

    @Autowired
    MockMvc mockMvc;

    @DynamicPropertySource
    static void githubProperties(DynamicPropertyRegistry registry) {
        String baseUrl = "http://127.0.0.1:" + GITHUB.getAddress().getPort();
        registry.add(
                "rilog.auth.github.authorization-endpoint",
                () -> baseUrl + "/oauth/authorize"
        );
        registry.add(
                "rilog.auth.github.token-endpoint",
                () -> baseUrl + "/oauth/token"
        );
        registry.add(
                "rilog.auth.github.user-endpoint",
                () -> baseUrl + "/user"
        );
    }

    @AfterAll
    static void stopGithubServer() {
        GITHUB.stop(0);
    }

    @Test
    @DisplayName("GitHub 로그인부터 토큰 교환, 갱신, 로그아웃까지 전체 인증 흐름이 동작한다.")
    void completeAuthenticationLifecycle() throws Exception {
        // given
        MvcResult login = mockMvc.perform(get("/api/auth/github/login"))
                .andExpect(status().isFound())
                .andReturn();
        String githubLocation = login.getResponse().getHeader(LOCATION);
        String state = queryParam(githubLocation, "state");
        String binding = cookieValue(
                login.getResponse().getHeader(SET_COOKIE),
                "__Secure-rilog-oauth-binding"
        );
        assertEquals("S256", queryParam(githubLocation, "code_challenge_method"));

        // when
        MvcResult callback = mockMvc.perform(get("/api/auth/github/callback")
                        .queryParam("code", "github-code")
                        .queryParam("state", state)
                        .cookie(new MockCookie(
                                "__Secure-rilog-oauth-binding", binding
                        )))
                .andExpect(status().isFound())
                .andReturn();
        String exchangeCode = queryParam(
                callback.getResponse().getHeader(LOCATION), "code"
        );
        assertTrue(TOKEN_REQUEST_BODY.get().contains("code_verifier="));

        // when
        MvcResult exchange = mockMvc.perform(post("/api/auth/token/exchange")
                        .header("Origin", FRONTEND_ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + exchangeCode + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String accessToken = bearerValue(exchange.getResponse().getHeader(AUTHORIZATION));
        String refreshToken = cookieValue(
                exchange.getResponse().getHeader(SET_COOKIE),
                "__Secure-rilog-refresh"
        );

        // then
        assertEquals(
                FRONTEND_ORIGIN,
                exchange.getResponse().getHeader("Access-Control-Allow-Origin")
        );
        assertEquals(
                "true",
                exchange.getResponse().getHeader("Access-Control-Allow-Credentials")
        );
        assertTrue(exchange.getResponse()
                .getHeader("Access-Control-Expose-Headers")
                .contains("Authorization"));

        // when
        mockMvc.perform(get("/test/protected")
                        .header(AUTHORIZATION, "Bearer " + accessToken))
                // then
                .andExpect(status().isOk())
                .andExpect(content().string("1"));

        // when
        MvcResult refresh = mockMvc.perform(post("/api/auth/token/refresh")
                        .header("Origin", FRONTEND_ORIGIN)
                        .cookie(new MockCookie(
                                "__Secure-rilog-refresh", refreshToken
                        )))
                .andExpect(status().isNoContent())
                .andReturn();
        String rotatedRefresh = cookieValue(
                refresh.getResponse().getHeader(SET_COOKIE),
                "__Secure-rilog-refresh"
        );

        // then
        assertNotNull(refresh.getResponse().getHeader(AUTHORIZATION));

        // when
        mockMvc.perform(post("/api/auth/logout")
                        .header("Origin", FRONTEND_ORIGIN)
                        .cookie(new MockCookie(
                                "__Secure-rilog-refresh", rotatedRefresh
                        )))
                // then
                .andExpect(status().isNoContent());

        // when
        mockMvc.perform(post("/api/auth/token/refresh")
                        .header("Origin", FRONTEND_ORIGIN)
                        .cookie(new MockCookie(
                                "__Secure-rilog-refresh", rotatedRefresh
                        )))
                // then
                .andExpect(status().isUnauthorized());
    }

    private static HttpServer startGithubServer() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/oauth/token", exchange -> {
                TOKEN_REQUEST_BODY.set(new String(exchange.getRequestBody().readAllBytes(), UTF_8));
                respondJson(
                        exchange,
                        "{\"access_token\":\"github-access-token\","
                                + "\"token_type\":\"bearer\"}"
                );
            });
            server.createContext("/user", exchange -> {
                if (!"Bearer github-access-token".equals(
                        exchange.getRequestHeaders().getFirst("Authorization")
                )) {
                    exchange.sendResponseHeaders(401, -1);
                    exchange.close();
                    return;
                }
                respondJson(
                        exchange,
                        "{\"id\":777,\"avatar_url\":\"avatar.png\","
                                + "\"html_url\":\"https://github.test/rilog\","
                                + "\"email\":null}"
                );
            });
            server.start();
            return server;
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to start fake GitHub server", exception);
        }
    }

    private static void respondJson(HttpExchange exchange, String body) throws IOException {
        byte[] bytes = body.getBytes(UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private String queryParam(String location, String name) {
        return UriComponentsBuilder.fromUriString(location)
                .build()
                .getQueryParams()
                .getFirst(name);
    }

    private String cookieValue(String setCookie, String name) {
        assertNotNull(setCookie);
        String prefix = name + "=";
        assertTrue(setCookie.startsWith(prefix));
        return setCookie.substring(prefix.length(), setCookie.indexOf(';'));
    }

    private String bearerValue(String authorization) {
        assertNotNull(authorization);
        assertTrue(authorization.startsWith("Bearer "));
        return authorization.substring("Bearer ".length());
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TestInfrastructure {

        @Bean
        @ServiceConnection
        PostgreSQLContainer postgresContainer() {
            return new PostgreSQLContainer("postgres:17-alpine");
        }

        @Bean
        ProtectedController protectedController() {
            return new ProtectedController();
        }

    }

    @RestController
    static class ProtectedController {

        @LoginRequired
        @GetMapping("/test/protected")
        String protectedEndpoint(@LoginUserId Long userId) {
            return userId.toString();
        }

    }

}
