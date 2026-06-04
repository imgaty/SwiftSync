-- Salt Edge customer ids can be reused across local users in development/test flows.
DROP INDEX IF EXISTS "User_saltEdgeCustomerId_key";

-- Align AuditLog.details with the Prisma Json? field.
CREATE OR REPLACE FUNCTION public._argent_text_to_jsonb(value text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
    IF value IS NULL THEN
        RETURN NULL;
    END IF;

    BEGIN
        RETURN value::jsonb;
    EXCEPTION WHEN others THEN
        RETURN to_jsonb(value);
    END;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'AuditLog'
          AND column_name = 'details'
          AND udt_name <> 'jsonb'
    ) THEN
        ALTER TABLE "AuditLog"
            ALTER COLUMN "details" TYPE JSONB
            USING public._argent_text_to_jsonb("details"::text);
    END IF;
END;
$$;

DROP FUNCTION public._argent_text_to_jsonb(text);
