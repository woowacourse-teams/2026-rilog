package kr.rilog.domain.therilog.controller;

import kr.rilog.domain.therilog.controller.apispec.TheRilogApiSpec;
import kr.rilog.domain.therilog.controller.dto.response.TheRilogResponse;
import kr.rilog.domain.therilog.service.TheRilogService;
import kr.rilog.domain.therilog.service.dto.result.TheRilogResult;
import kr.rilog.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class TheRilogController implements TheRilogApiSpec {

    private final TheRilogService theRilogService;

    @GetMapping("/the-rilog")
    public ApiResponse<TheRilogResponse> getTheRilog() {
        TheRilogResult result = theRilogService.readTheRilog();
        TheRilogResponse data = TheRilogResponse.from(result);
        return ApiResponse.response(HttpStatus.OK, "더 리로그 메인 조회에 성공했습니다.", data);
    }
}
