-- Create resource progress tracking table
CREATE TABLE IF NOT EXISTS "public"."resource_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "resource_progress_user_id_resource_id_key" UNIQUE ("user_id", "resource_id")
);

-- Add foreign key constraints
ALTER TABLE ONLY "public"."resource_progress"
    ADD CONSTRAINT "resource_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."resource_progress"
    ADD CONSTRAINT "resource_progress_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."course_resources"("id") ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX "idx_resource_progress_user" ON "public"."resource_progress" USING "btree" ("user_id");
CREATE INDEX "idx_resource_progress_resource" ON "public"."resource_progress" USING "btree" ("resource_id");

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER "update_resource_progress_updated_at" 
    BEFORE UPDATE ON "public"."resource_progress" 
    FOR EACH ROW 
    EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Grant permissions
GRANT ALL ON TABLE "public"."resource_progress" TO "anon";
GRANT ALL ON TABLE "public"."resource_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_progress" TO "service_role";
