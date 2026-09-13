create table users
(
    id                      bigint auto_increment
        primary key,
    created_at              datetime(6)                   null,
    deleted_at              datetime(6)                   null,
    updated_at              datetime(6)                   null,
    email                   varchar(256)                  null,
    github_id               bigint                        not null,
    github_url              varchar(512)                  null,
    global_role             enum ('ADMIN', 'USER')        not null,
    introduction            varchar(80)                   null,
    nickname                varchar(20)                   null,
    onboarding_completed_at datetime(6)                   null,
    onboarding_status       enum ('COMPLETED', 'PENDING') not null,
    profile_image_url       varchar(512)                  null,
    slug                    varchar(20)                   null,
    constraint uk_users_nickname
        unique (nickname),
    constraint uk_users_slug
        unique (slug),
    constraint uk_users_github_id
        unique (github_id)
);

create table blog
(
    id                bigint auto_increment
        primary key,
    created_at        datetime(6)             null,
    deleted_at        datetime(6)             null,
    updated_at        datetime(6)             null,
    blog_type         enum ('COLOG', 'RILOG') not null,
    cover_image_url   varchar(512)            null,
    email             varchar(512)            null,
    github_url        varchar(512)            null,
    introduction      varchar(80)             null,
    name              varchar(20)             not null,
    profile_image_url varchar(512)            null,
    service_url       varchar(512)            null,
    slug              varchar(20)             not null,
    owner_id          bigint                  not null,
    constraint uk_blog_slug
        unique (slug),
    constraint fk_blog_owner
        foreign key (owner_id) references users (id)
);

create table blog_member
(
    id         bigint auto_increment
        primary key,
    created_at datetime(6)                       null,
    deleted_at datetime(6)                       null,
    updated_at datetime(6)                       null,
    blog_role  varchar(50)                       null,
    joined_at  datetime(6)                       null,
    permission enum ('ADMIN', 'MEMBER', 'OWNER') not null,
    status     enum ('ACTIVE', 'LEFT')           not null,
    blog_id    bigint                            not null,
    user_id    bigint                            not null,
    constraint fk_blog_member_user
        foreign key (user_id) references users (id),
    constraint fk_blog_member_blog
        foreign key (blog_id) references blog (id)
);

create table chapter
(
    id            bigint auto_increment
        primary key,
    created_at    datetime(6) null,
    deleted_at    datetime(6) null,
    updated_at    datetime(6) null,
    name          varchar(20) not null,
    chapter_order int         not null,
    blog_id       bigint      not null,
    constraint fk_chapter_blog
        foreign key (blog_id) references blog (id)
);

create table post
(
    id                  bigint auto_increment
        primary key,
    created_at          datetime(6)                              null,
    deleted_at          datetime(6)                              null,
    updated_at          datetime(6)                              null,
    category            enum ('DAILY', 'RETROSPECT', 'TECH')     null,
    content             json                                     not null,
    published_at        datetime(6)                              null,
    status              enum ('DRAFT', 'PUBLISHED')              not null,
    thumbnail_image_url varchar(512)                             null,
    title               varchar(512)                             null,
    visibility          enum ('PRIVATE', 'PUBLIC')               not null,
    chapter_id          bigint                                   null,
    colog_id            bigint                                   null,
    rilog_id            bigint                                   not null,
    user_id             bigint                                   not null,
    constraint fk_post_user
        foreign key (user_id) references users (id),
    constraint fk_post_rilog
        foreign key (rilog_id) references blog (id),
    constraint fk_post_colog
        foreign key (colog_id) references blog (id),
    constraint fk_post_chapter
        foreign key (chapter_id) references chapter (id)
);

create table comment
(
    id          bigint auto_increment
        primary key,
    created_at  datetime(6)   null,
    deleted_at  datetime(6)   null,
    updated_at  datetime(6)   null,
    anchor_type enum ('POST') not null,
    content     varchar(1000) not null,
    parent_id   bigint        null,
    post_id     bigint        not null,
    user_id     bigint        not null,
    constraint fk_comment_parent
        foreign key (parent_id) references comment (id),
    constraint fk_comment_user
        foreign key (user_id) references users (id),
    constraint fk_comment_post
        foreign key (post_id) references post (id)
);
