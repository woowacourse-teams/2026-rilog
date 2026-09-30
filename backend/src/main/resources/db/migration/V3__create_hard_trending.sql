create table hard_trending
(
    id      bigint not null
        primary key,
    post_id bigint not null,
    constraint uk_hard_trending_post_id
        unique (post_id),
    constraint fk_hard_trending_post
        foreign key (post_id) references post (id)
);
