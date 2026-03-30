-- Initialize 4 separate databases for isolated modules
-- Each database is owned by the postgres user

CREATE DATABASE products_db OWNER postgres;
CREATE DATABASE content_db OWNER postgres;
CREATE DATABASE publish_db OWNER postgres;
CREATE DATABASE config_db OWNER postgres;

-- Set default settings for all databases
ALTER DATABASE products_db SET timezone = 'UTC';
ALTER DATABASE content_db SET timezone = 'UTC';
ALTER DATABASE publish_db SET timezone = 'UTC';
ALTER DATABASE config_db SET timezone = 'UTC';

-- Grant all privileges to postgres user (development only)
GRANT ALL PRIVILEGES ON DATABASE products_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE content_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE publish_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE config_db TO postgres;
