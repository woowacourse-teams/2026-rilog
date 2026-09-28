create table comment_anchor_selection
(
    id            bigint auto_increment
        primary key,
    created_at    datetime(6)                         null,
    deleted_at    datetime(6)                         null,
    updated_at    datetime(6)                         null,
    post_id       bigint                              not null,
    block_id      varchar(255)
        character set utf8mb4
        collate utf8mb4_0900_bin                      not null,
    start_offset  int                                 not null,
    end_offset    int                                 not null,
    selected_text text
        character set utf8mb4
        collate utf8mb4_0900_bin                      not null,
    status        enum ('ACTIVE', 'ORPHANED')         not null,
    orphaned_at   datetime(6)                         null,
    constraint fk_comment_anchor_selection_post
        foreign key (post_id) references post (id)
);

create table comment_anchor
(
    id                          bigint auto_increment
        primary key,
    created_at                  datetime(6)   null,
    deleted_at                  datetime(6)   null,
    updated_at                  datetime(6)   null,
    comment_anchor_selection_id bigint        not null,
    user_id                     bigint        not null,
    content                     varchar(1000) not null,
    constraint fk_comment_anchor_selection
        foreign key (comment_anchor_selection_id) references comment_anchor_selection (id),
    constraint fk_comment_anchor_user
        foreign key (user_id) references users (id)
);
