ALTER TABLE `columns` RENAME TO `lists`;--> statement-breakpoint
ALTER TABLE `tasks` RENAME COLUMN "column_id" TO "list_id";--> statement-breakpoint
ALTER TABLE `tasks` RENAME COLUMN "title" TO "content";--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`title` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lists`("id", "board_id", "title", "order", "created_at") SELECT "id", "board_id", "title", "order", "created_at" FROM `lists`;--> statement-breakpoint
DROP TABLE `lists`;--> statement-breakpoint
ALTER TABLE `__new_lists` RENAME TO `lists`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX "boards_slug_unique";--> statement-breakpoint
DROP INDEX "slug_idx";--> statement-breakpoint
DROP INDEX "users_username_unique";--> statement-breakpoint
DROP INDEX "username_idx";--> statement-breakpoint
ALTER TABLE `tasks` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `boards_slug_unique` ON `boards` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `slug_idx` ON `boards` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `username_idx` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `tasks` ALTER COLUMN "list_id" TO "list_id" text NOT NULL REFERENCES lists(id) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `boards` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;