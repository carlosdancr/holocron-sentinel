-- Cria o banco de testes caso não exista.
-- Este script é executado automaticamente pelo PostgreSQL na primeira
-- inicialização do container (montado via docker-entrypoint-initdb.d).
SELECT 'CREATE DATABASE holocron_sentinel_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'holocron_sentinel_test')\gexec
