package kr.rilog.domain.post.controller.apispec;

final class PostDetailResponseExamples {

    static final String RILOG = """
            {
              "status": 200,
              "message": "게시글 상세 조회에 성공했습니다.",
              "data": {
                "title": "Spring 트랜잭션 정리",
                "content": {
                  "type": "doc",
                  "content": []
                },
                "publishedAt": "2026-08-17T04:30:00",
                "thumbnailImageUrl": null,
                "category": "기술",
                "author": {
                  "nickname": "파라디",
                  "userId": 7,
                  "slug": "jetproc",
                  "profileImageUrl": null
                },
                "affiliation": {
                  "type": "RILOG",
                  "blogId": 3,
                  "slug": "jetproc",
                  "name": "파라디",
                  "profileImageUrl": null
                }
              }
            }
            """;

    static final String COLOG = """
            {
              "status": 200,
              "message": "게시글 상세 조회에 성공했습니다.",
              "data": {
                "title": "리로그 개발 회고",
                "content": {
                  "type": "doc",
                  "content": []
                },
                "publishedAt": "2026-08-17T04:40:00",
                "thumbnailImageUrl": null,
                "category": "일상",
                "author": {
                  "nickname": "파라디",
                  "userId": 7,
                  "slug": "jetproc",
                  "profileImageUrl": null
                },
                "affiliation": {
                  "type": "COLOG",
                  "blogId": 5,
                  "slug": "rilog",
                  "name": "Rilog",
                  "logoImageUrl": null,
                  "coverImageUrl": null,
                  "memberCount": 8,
                  "postCount": 42
                }
              }
            }
            """;

    private PostDetailResponseExamples() {
    }
}
