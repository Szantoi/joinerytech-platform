-- init-module-app-roles.sql — modul app-szerepek kiosztása (RLS-kompatibilis)
--
-- MIÉRT: a PostgreSQL superuser (és minden `BYPASSRLS` szerep) MEGKERÜLI a
-- row-level security policyt, `FORCE ROW LEVEL SECURITY` mellett is. A saját
-- kódunk dokumentálja:
--   src/spaceos-modules-hosting/.../Persistence/RlsMigrationSql.cs:14-15
--     „PostgreSQL superusers always bypass RLS regardless of FORCE — the deploy
--      role must not be a superuser for the policies to bite."
-- Vagyis ha egy modul superuserrel csatlakozik, a bérlő-izoláció NEM érvényesül,
-- akkor sem, ha az összes policy és a 28 RLS-proof teszt zöld.
--
-- MIT CSINÁL: modulonként egy `NOSUPERUSER NOBYPASSRLS` app-szerepet hoz létre,
-- és megadja neki a séma-szintű jogokat. A séma tulajdonosa NEM az app-szerep
-- (a kernel `init-roles.sql` mintája: külön, NOLOGIN `schema_owner`).
--
-- HASZNÁLAT (példa):
--   psql -h <host> -p <port> -d <db> -v role_name=spaceos_hr_app \
--        -v role_password="$HR_DB_PASSWORD" -v schema_name=hr \
--        -f scripts/db/init-module-app-roles.sql
--
-- ⚠ A jelszót NE ide írd és NE a repóba: env-változóból jöjjön (a
-- `appsettings.json`-ben szándékosan `CHANGE_ME` áll, hogy a hiányzó override
-- azonnal kiderüljön, ne csendben superuserrel induljon a modul).

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'role_name') THEN
    EXECUTE format(
      'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION',
      :'role_name', :'role_password');
  ELSE
    -- Meglévő szerep: a jogosultságokat AKKOR IS lecsavarjuk, ha valaki
    -- korábban tágabbra állította (idempotens, biztonsági irányba).
    EXECUTE format(
      'ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION',
      :'role_name');
  END IF;
END
$$;

-- Séma-szintű jogok (a séma már létezik: a migráció hozza létre).
GRANT USAGE ON SCHEMA :"schema_name" TO :"role_name";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA :"schema_name" TO :"role_name";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA :"schema_name" TO :"role_name";
ALTER DEFAULT PRIVILEGES IN SCHEMA :"schema_name"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"role_name";
ALTER DEFAULT PRIVILEGES IN SCHEMA :"schema_name"
  GRANT USAGE, SELECT ON SEQUENCES TO :"role_name";

-- Ellenőrzés — ennek MINDIG `f | f`-et kell adnia:
SELECT rolname, rolsuper, rolbypassrls
FROM pg_roles
WHERE rolname = :'role_name';
