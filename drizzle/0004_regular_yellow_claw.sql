CREATE TABLE `communityChallenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`targetDays` int NOT NULL,
	`accent` varchar(24) NOT NULL DEFAULT 'sun',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communityChallenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `communityChallenges_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `communityMemberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`challengeId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communityMemberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `userChallengeUnique` UNIQUE(`userId`,`challengeId`)
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `energyMode` enum('low','normal','locked') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `communityOptIn` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `celebrationStyle` enum('calm','funny','direct','quiet') DEFAULT 'calm' NOT NULL;