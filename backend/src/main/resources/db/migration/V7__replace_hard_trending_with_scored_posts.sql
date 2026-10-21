-- 수동 선정 결과는 새 점수 정책과 호환되지 않는다. 게시글 원본은 유지한다.
DELETE FROM hard_trending;
ALTER TABLE hard_trending RENAME TO trending_post;
ALTER TABLE trending_post ADD COLUMN score DECIMAL(30, 6) NOT NULL;
ALTER TABLE trending_post ADD COLUMN calculated_at DATETIME(6) NOT NULL;

CREATE INDEX idx_post_trending_candidates ON post (status, visibility, post_type, published_at);
CREATE INDEX idx_blog_member_trending ON blog_member (blog_id, user_id, status, deleted_at);
