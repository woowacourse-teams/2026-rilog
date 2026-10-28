-- 구버전 앱을 종료하고 댓글 쓰기를 멈춘 상태에서 적용한다.
-- 백필과 새 앱 전환을 완료한 후 댓글 쓰기를 재개한다.
ALTER TABLE post
    ADD COLUMN comment_count BIGINT NOT NULL DEFAULT 0;

-- 기존 피드와 같은 기준으로 모든 게시글을 초기화한다.
-- ORPHANED 여부나 selection/작성자의 삭제 여부로 추가 필터링하지 않는다.
UPDATE post p
SET comment_count = (
    SELECT COUNT(anchor.id)
    FROM comment_anchor_selection selection
    JOIN comment_anchor anchor
      ON anchor.comment_anchor_selection_id = selection.id
    WHERE selection.post_id = p.id
      AND anchor.deleted_at IS NULL
);
