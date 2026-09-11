ALTER TABLE `profiles` ADD `focusWhy` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `anchorNextStep` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `weeklyReviewDay` int DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE `visions` ADD `visionPlan` text;