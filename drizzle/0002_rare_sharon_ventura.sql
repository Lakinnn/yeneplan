ALTER TABLE `profiles` ADD `theme` enum('light','dark') DEFAULT 'light' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `telegramChatId` varchar(64);--> statement-breakpoint
ALTER TABLE `profiles` ADD `telegramLinkToken` varchar(96);--> statement-breakpoint
ALTER TABLE `profiles` ADD `telegramConnectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `profiles` ADD `reminderEnabled` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `reminderTime` varchar(5) DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `visions` ADD `imageUrl` text;--> statement-breakpoint
ALTER TABLE `visions` ADD `imageKey` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_telegramLinkToken_unique` UNIQUE(`telegramLinkToken`);