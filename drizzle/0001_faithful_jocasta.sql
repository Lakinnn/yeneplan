CREATE TABLE `checkIns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int,
	`ethiopianDate` varchar(32) NOT NULL,
	`mood` int,
	`note` text,
	`status` enum('done','missed','rest') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checkIns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coachMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coachMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`period` enum('year','month','day') NOT NULL,
	`ethiopianYear` int NOT NULL,
	`ethiopianMonth` int,
	`ethiopianDay` int,
	`title` varchar(180) NOT NULL,
	`detail` text,
	`status` enum('backlog','active','done','missed') NOT NULL DEFAULT 'backlog',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(120),
	`ethiopianYear` int NOT NULL DEFAULT 2019,
	`currentMonth` int NOT NULL DEFAULT 1,
	`currentDay` int NOT NULL DEFAULT 1,
	`focus` text,
	`timezone` varchar(80) NOT NULL DEFAULT 'Africa/Addis_Ababa',
	`coachTone` enum('warm','direct','chaotic') NOT NULL DEFAULT 'warm',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `visions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`reason` text,
	`category` varchar(80) NOT NULL DEFAULT 'life',
	`emoji` varchar(8) NOT NULL DEFAULT '✦',
	`color` varchar(24) NOT NULL DEFAULT 'sun',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visions_id` PRIMARY KEY(`id`)
);
