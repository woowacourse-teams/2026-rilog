package kr.rilog.support;

import java.util.Set;
import org.springframework.test.context.ActiveProfilesResolver;

public class TestDatabaseProfileResolver implements ActiveProfilesResolver {

    private static final String ACTIVE_PROFILES_PROPERTY = "spring.profiles.active";
    private static final String DEFAULT_PROFILE = "test";
    private static final Set<String> SUPPORTED_PROFILES = Set.of(DEFAULT_PROFILE, "mysql-test");

    @Override
    public String[] resolve(Class<?> testClass) {
        String activeProfile = System.getProperty(ACTIVE_PROFILES_PROPERTY, DEFAULT_PROFILE);
        if (!SUPPORTED_PROFILES.contains(activeProfile)) {
            throw new IllegalStateException("지원하지 않는 테스트 DB 프로필입니다: " + activeProfile);
        }
        return new String[]{activeProfile};
    }

}
