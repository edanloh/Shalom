-- Add ppt to course_resources resource_type check constraint and migrate existing slides
-- Run this in Supabase SQL editor

ALTER TABLE public.course_resources
  DROP CONSTRAINT IF EXISTS course_resources_resource_type_check;

ALTER TABLE public.course_resources
  ADD CONSTRAINT course_resources_resource_type_check
  CHECK (
    (resource_type)::text = ANY (
      (ARRAY[
        'pdf'::character varying,
        'document'::character varying,
        'ppt'::character varying,
        'ppt'::character varying,      
        'other'::character varying
      ])::text[]
    )
  );

