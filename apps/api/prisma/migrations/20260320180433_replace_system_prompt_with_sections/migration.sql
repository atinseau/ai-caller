-- Add the new JSON column
ALTER TABLE "Company" ADD COLUMN "systemPromptSections" JSONB;

-- Migrate existing systemPrompt data into the roleObjective section
UPDATE "Company"
SET "systemPromptSections" = jsonb_build_object('roleObjective', "systemPrompt")
WHERE "systemPrompt" IS NOT NULL AND "systemPrompt" != '';

-- Drop the old column
ALTER TABLE "Company" DROP COLUMN "systemPrompt";
