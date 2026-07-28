CREATE TABLE `demo_rate_limits` (
	`scope` text NOT NULL,
	`client_hash` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`scope`, `client_hash`)
);
