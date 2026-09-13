package net.lvrbl.authorizationservice;

import net.lvrbl.authorizationservice.controller.AuthController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;

import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import org.springframework.test.web.servlet.client.RestTestClient;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;


@Testcontainers
@AutoConfigureRestTestClient
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthorizationServiceApplicationTests {

    @Autowired
    private AuthController controller;

    @Autowired
    private RestTestClient restTestClient;

    public record SignUpRequest(String username, String password, String email) {}

    @Container
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);

        // Flyway использует отдельные свойства, если они заданы явно
        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", postgres::getUsername);
        registry.add("spring.flyway.password", postgres::getPassword);
    }

    @Test
    void contextLoads() {
        assertThat(controller).isNotNull();
    }

    @Test
    void checkIfGetMainContentBeforeAuth() {
        restTestClient.get()
                .uri("/api/v1/content/1")
                .exchange()
                .expectStatus().isForbidden();
    }

    @Test
    void tryToSignUpAndReSignUp() {
        SignUpRequest request = new SignUpRequest(
                "test",
                "test",
                "test@test.com"
        );

        restTestClient.post()
                .uri("/api/v1/signUp")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .exchange()
                .expectStatus().isOk();
    }

    @Test
    void tryToResSignUpOnExistingUser() {
        SignUpRequest request = new SignUpRequest(
                "test",
                "test",
                "test@test.com"
        );

        restTestClient.post()
                .uri("/api/v1/signUp")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void tryToLogInCorrectly() {
        SignUpRequest request = new SignUpRequest(
                "test",
                "test",
                "test@test.com"
        );

        restTestClient.post()
                .uri("/api/v1/signIn")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .exchange()
                .expectStatus().isOk();
    }

    @Test
    void tryToLogInWithoutUsername() {
        SignUpRequest request = new SignUpRequest(
                "",
                "test",
                "test@test.com"
        );

        restTestClient.post()
                .uri("/api/v1/signIn")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .exchange()
                .expectStatus().isOk();
    }

    @Test
    void tryToLogInWithoutEmailOrPassword() {
        SignUpRequest request = new SignUpRequest(
                "test",
                "",
                ""
        );

        restTestClient.post()
                .uri("/api/v1/signIn")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .exchange()
                .expectStatus().isNotFound();
    }

    @Test
    void tryToLogInWithWrongEmail() {
        SignUpRequest request = new SignUpRequest(
                "test",
                "test",
                "testtesttest@testtesttest.testtesttest"
        );

        restTestClient.post()
                .uri("/api/v1/signIn")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void tryToLogInWithWrongPassword() {
        SignUpRequest request = new SignUpRequest(
                "test",
                "testtesttest",
                "test@test.com"
        );

        restTestClient.post()
                .uri("/api/v1/signIn")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .exchange()
                .expectStatus().isBadRequest();
    }
}