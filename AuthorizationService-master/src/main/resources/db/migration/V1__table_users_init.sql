CREATE TABLE users (
    created_at timestamptz(6) DEFAULT now() NOT NULL,
    updated_at timestamptz(6) NOT NULL,
    "uuid" uuid NOT NULL,email varchar(50) NOT NULL,
    "password" varchar(200) NOT NULL,
    username varchar(50) NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (uuid)
);