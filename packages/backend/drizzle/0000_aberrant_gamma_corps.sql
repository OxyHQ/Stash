-- oxy:deploy-phase=pre

CREATE TABLE "album_items" (
	"id" text PRIMARY KEY NOT NULL,
	"album_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"mime" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"seeds" text[] DEFAULT '{}'::text[] NOT NULL,
	"taken_at" timestamp with time zone,
	"added_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "album_items_album_asset_unique" UNIQUE("album_id","asset_id"),
	CONSTRAINT "album_items_size_check" CHECK ("album_items"."width" > 0 and "album_items"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "albums" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"cover_item_id" text,
	"created_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "albums_name_length_check" CHECK (char_length("albums"."name") between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "album_items" ADD CONSTRAINT "album_items_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "album_items_album_id_idx" ON "album_items" USING btree ("album_id","id");--> statement-breakpoint
CREATE INDEX "albums_owner_user_id_idx" ON "albums" USING btree ("owner_user_id","created_at");