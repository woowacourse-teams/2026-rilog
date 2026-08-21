package kr.rilog;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import kr.rilog.global.healthcheck.HealthCheckController;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class RilogApplicationTest {

	@Test
	void healthEndpointReturnsOk() throws Exception {
		MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new HealthCheckController()).build();

		mockMvc.perform(get("/health"))
			.andExpect(status().isOk())
			.andExpect(content().string("ok"));
	}
}
