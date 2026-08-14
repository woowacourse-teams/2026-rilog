package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BlogService {

    private final BlogRepository blogRepository;

    public List<MyCologResponse> getMyCologsPreview(Long requesterId) {
        return blogRepository.findAllActiveCologsByUserId(requesterId).stream()
                .map(MyCologResponse::of)
                .toList();
    }

    @Transactional
    public void createRilogIfAbsent(User user) {
        if (blogRepository.findRilogByOwnerId(user.getId()).isPresent()) {
            return;
        }

        blogRepository.save(Blog.createRilog(user));
    }

}
