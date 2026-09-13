package kr.rilog.global.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class CloudWatchLogsDeploymentConfigTest {

    private static final Path DEPLOY_SCRIPT = Path.of("scripts/deploy-backend-container.sh");

    @Test
    @DisplayName("배포 스크립트는 Docker awslogs 드라이버와 환경별 로그 그룹을 사용한다.")
    void deployScriptUsesAwslogsDriverWithEnvironmentLogGroup() throws Exception {
        Path envFile = Files.createTempFile("rilog-backend", ".env");

        try {
            ProcessResult result = runDeployScript(Map.of(
                    "DOCKER_USER_NAME", "rilog",
                    "DOCKER_IMAGE", "backend",
                    "DOCKER_TAG", "prod",
                    "AWS_REGION", "ap-northeast-2",
                    "RILOG_ENV", "prod",
                    "RILOG_LOG_RETENTION_DAYS", "30",
                    "RILOG_ENV_FILE", envFile.toString()
            ));

            assertThat(result.exitCode()).isZero();
            assertThat(result.output())
                    .contains(
                            "aws logs put-retention-policy --log-group-name /rilog/backend/prod --retention-in-days 30",
                            "docker pull rilog/backend:prod",
                            "--log-driver awslogs",
                            "awslogs-region=ap-northeast-2",
                            "awslogs-group=/rilog/backend/prod",
                            "awslogs-create-group=false",
                            "tag=prod/{{.Name}}/{{.ID}}",
                            "--env-file " + envFile,
                            "-e SPRING_PROFILES_ACTIVE=prod",
                            "docker run"
                    )
                    .doesNotContain(
                            "aws logs create-log-group",
                            "awslogs-multiline-pattern",
                            "awslogs-datetime-format"
                    );
        } finally {
            Files.deleteIfExists(envFile);
        }
    }

    @Test
    @DisplayName("배포 스크립트는 이미지 소유자와 이미지 이름이 없으면 중단한다.")
    void deployScriptRequiresImageOwnerAndImageName() throws Exception {
        ProcessResult result = runDeployScript(Map.of(
                "DOCKER_IMAGE", "backend",
                "RILOG_ENV", "prod"
        ));

        assertThat(result.exitCode()).isNotZero();
        assertThat(result.output()).contains("DOCKER_USER_NAME");
    }

    @Test
    @DisplayName("백엔드 배포 워크플로우는 환경별 CloudWatch 로그 설정을 전달한다.")
    void backendDeployWorkflowsPassCloudWatchLogSettings() throws IOException {
        String devWorkflow = Files.readString(Path.of("../.github/workflows/rilog-be-dev.yml"));
        String prodWorkflow = Files.readString(Path.of("../.github/workflows/rilog-be-prod.yml"));

        assertThat(devWorkflow)
                .contains(
                        "backend/scripts/deploy-backend-container.sh",
                        "RILOG_ENV: dev",
                        "RILOG_LOG_GROUP: /rilog/backend/dev",
                        "RILOG_LOG_RETENTION_DAYS: 7"
                );
        assertThat(prodWorkflow)
                .contains(
                        "backend/scripts/deploy-backend-container.sh",
                        "RILOG_ENV: prod",
                        "RILOG_LOG_GROUP: /rilog/backend/prod",
                        "RILOG_LOG_RETENTION_DAYS: 30"
                );
    }

    private ProcessResult runDeployScript(Map<String, String> environment) throws IOException, InterruptedException {
        ProcessBuilder processBuilder = new ProcessBuilder("bash", DEPLOY_SCRIPT.toString());
        processBuilder.environment().put("DRY_RUN", "true");
        processBuilder.environment().putAll(environment);
        processBuilder.redirectErrorStream(true);

        Process process = processBuilder.start();
        boolean finished = process.waitFor(5, TimeUnit.SECONDS);
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

        assertThat(finished).isTrue();
        return new ProcessResult(process.exitValue(), output);
    }

    private record ProcessResult(int exitCode, String output) {
    }
}
