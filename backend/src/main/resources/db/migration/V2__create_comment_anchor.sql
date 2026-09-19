create table comment_anchor
(
    id            bigint auto_increment
        primary key,
    created_at    datetime(6)                                                  null,
    deleted_at    datetime(6)                                                  null,
    updated_at    datetime(6)                                                  null,
    post_id       bigint                                                       not null,
    user_id       bigint                                                       not null,
    block_id      varchar(255)                                                 not null,
    start_offset  int                                                          not null,
    end_offset    int                                                          not null,
    selected_text text                                                         not null,
    content       varchar(1000)                                                not null,
    status        enum ('ACTIVE', 'ORPHANED')                                  not null,
    orphaned_at   datetime(6)                                                  null,
    constraint fk_comment_anchor_post
        foreign key (post_id) references post (id),
    constraint fk_comment_anchor_user
        foreign key (user_id) references users (id)
);

create index idx_comment_anchor_post_range
    on comment_anchor (post_id, block_id, start_offset, end_offset);
