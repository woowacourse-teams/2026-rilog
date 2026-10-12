alter table post
    add column post_type enum ('STANDARD', 'DAILY_HEADLINES', 'ENTERPRISE_SPOTLIGHT', 'PERSONAL_SPOTLIGHT')
        not null default 'STANDARD';

alter table post
    add column description varchar(100) null;

create table post_source
(
    post_id              bigint       not null primary key,
    created_at           datetime(6)  null,
    deleted_at           datetime(6)  null,
    updated_at           datetime(6)  null,
    source_profile_name  varchar(255) not null,
    source_profile_image varchar(512) null,
    constraint fk_post_source_post
        foreign key (post_id) references post (id)
) engine = InnoDB;
