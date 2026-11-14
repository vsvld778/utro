CREATE TABLE `cms_documents` (
	`path` text PRIMARY KEY NOT NULL,
	`draft` text NOT NULL,
	`published` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`published_version` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE TABLE `cms_inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`message` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cms_media` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cms_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`config` text NOT NULL,
	`action` text NOT NULL,
	`editor` text NOT NULL,
	`created_at` text NOT NULL
);
