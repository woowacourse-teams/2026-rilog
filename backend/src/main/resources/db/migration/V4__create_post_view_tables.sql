create table post_view_count
(
    post_id    bigint not null primary key,
    view_count bigint not null default 0,
    constraint fk_post_view_count_post
        foreign key (post_id) references post (id),
    constraint ck_post_view_count_range
        check (view_count between 0 and 9007199254740991)
) engine = InnoDB;

create table post_view_flush_batch
(
    batch_id   char(36)    not null primary key,
    post_id    bigint      not null,
    delta      bigint      not null,
    created_at datetime(6) not null,
    constraint fk_post_view_flush_batch_count
        foreign key (post_id) references post_view_count (post_id),
    constraint ck_post_view_flush_batch_delta
        check (delta between 1 and 9007199254740991)
) engine = InnoDB;

-- 비공개/soft-deleted 발행 글도 복원과 공개 전환에 대비해 초기화한다.
insert into post_view_count (post_id, view_count)
select id, 0 from post where status = 'PUBLISHED';
