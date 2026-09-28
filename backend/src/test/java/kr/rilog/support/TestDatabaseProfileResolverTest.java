package kr.rilog.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.junit.jupiter.api.parallel.Resources;

@ResourceLock(Resources.SYSTEM_PROPERTIES)
class TestDatabaseProfileResolverTest {

    private static final String ACTIVE_PROFILES_PROPERTY = "spring.profiles.active";

    private final TestDatabaseProfileResolver resolver = new TestDatabaseProfileResolver();

    private String previousActiveProfile;

    @BeforeEach
    void preserveActiveProfile() {
        previousActiveProfile = System.getProperty(ACTIVE_PROFILES_PROPERTY);
    }

    @AfterEach
    void restoreActiveProfile() {
        if (previousActiveProfile == null) {
            System.clearProperty(ACTIVE_PROFILES_PROPERTY);
            return;
        }
        System.setProperty(ACTIVE_PROFILES_PROPERTY, previousActiveProfile);
    }

    @Test
    void resolvesTestProfileByDefault() {
        System.clearProperty(ACTIVE_PROFILES_PROPERTY);

        String[] profiles = resolver.resolve(getClass());

        assertThat(profiles).containsExactly("test");
    }

    @Test
    void resolvesConfiguredProfile() {
        System.setProperty(ACTIVE_PROFILES_PROPERTY, "mysql-test");

        String[] profiles = resolver.resolve(getClass());

        assertThat(profiles).containsExactly("mysql-test");
    }

    @Test
    void rejectsUnsupportedProfile() {
        System.setProperty(ACTIVE_PROFILES_PROPERTY, "production");

        assertThatThrownBy(() -> resolver.resolve(getClass()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("지원하지 않는 테스트 DB 프로필입니다: production");
    }

}
