-- Create a separate database for Infisical
-- This runs automatically on first PostgreSQL init
SELECT 'CREATE DATABASE infisical'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'infisical')\gexec
