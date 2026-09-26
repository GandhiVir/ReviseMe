CREATE TABLE "chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"text" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"topic" text NOT NULL,
	"week_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"question" text NOT NULL,
	"correct_answer" text NOT NULL,
	"source_chunk_ids" jsonb NOT NULL,
	"user_answer" text,
	"was_correct" boolean,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_mastery" (
	"subject_id" text NOT NULL,
	"topic" text NOT NULL,
	"correct_streak" integer DEFAULT 0 NOT NULL,
	"last_reviewed" timestamp with time zone,
	"next_due_date" timestamp with time zone DEFAULT now() NOT NULL,
	"ease_factor" real DEFAULT 2.5 NOT NULL,
	CONSTRAINT "topic_mastery_subject_id_topic_pk" PRIMARY KEY("subject_id","topic")
);
--> statement-breakpoint
CREATE TABLE "weekly_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"week_number" integer NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_text" text NOT NULL,
	"source_type" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_note_id_weekly_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."weekly_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_mastery" ADD CONSTRAINT "topic_mastery_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_notes" ADD CONSTRAINT "weekly_notes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_subject_id_idx" ON "chunks" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_subject_id_idx" ON "quiz_attempts" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "subjects_user_id_idx" ON "subjects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "weekly_notes_subject_id_idx" ON "weekly_notes" USING btree ("subject_id");