CREATE TABLE `admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(100) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`admin_id` int,
	`admin_name` varchar(100),
	`action` varchar(100) NOT NULL,
	`entity_type` enum('driver','booking','zone','admin') NOT NULL,
	`entity_id` int,
	`entity_label` varchar(200),
	`meta` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(20) NOT NULL,
	`customer_name` varchar(100) NOT NULL,
	`customer_email` varchar(100) NOT NULL,
	`customer_phone` varchar(20) NOT NULL,
	`passengers` smallint NOT NULL DEFAULT 1,
	`luggage` smallint NOT NULL DEFAULT 1,
	`zone_id` int,
	`pickup_address` varchar(255) NOT NULL,
	`dropoff_address` varchar(255) NOT NULL,
	`distance_km` decimal(8,2) NOT NULL,
	`duration_minutes` int,
	`pickup_datetime` timestamp NOT NULL,
	`flight_number` varchar(20),
	`vehicle_type` enum('sedan','van','luxury') NOT NULL DEFAULT 'sedan',
	`base_price` decimal(10,2) NOT NULL DEFAULT '4.00',
	`price_per_km` decimal(5,2) NOT NULL DEFAULT '2.50',
	`total_price` decimal(10,2) NOT NULL,
	`driver_id` int,
	`driver_accepted_at` timestamp,
	`status` enum('pending','paid','sent_to_drivers','accepted','driver_on_way','passenger_picked','completed','cancelled') NOT NULL DEFAULT 'pending',
	`customer_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`first_name` varchar(50) NOT NULL,
	`last_name` varchar(50) NOT NULL DEFAULT '',
	`email` varchar(100),
	`phone` varchar(20) NOT NULL DEFAULT '',
	`p_number` varchar(50),
	`telegram_chat_id` bigint,
	`telegram_username` varchar(100),
	`vehicle_type` enum('sedan','van','luxury') NOT NULL DEFAULT 'sedan',
	`car_brand` varchar(50),
	`car_model` varchar(50),
	`car_year` varchar(4),
	`license_plate` varchar(20),
	`company_name` varchar(100),
	`address` varchar(200),
	`postcode` varchar(10),
	`city` varchar(50),
	`btw_number` varchar(50),
	`kvk_number` varchar(20),
	`iban` varchar(34),
	`account_holder` varchar(100),
	`payment_cycle` enum('daily','weekly','monthly') DEFAULT 'daily',
	`insurance_file_id` varchar(500),
	`insurance_expiry` date,
	`drivers_license_file_id` varchar(500),
	`drivers_license_expiry` date,
	`taxi_card_file_id` varchar(500),
	`taxi_card_expiry` date,
	`terms_accepted` boolean NOT NULL DEFAULT false,
	`terms_accepted_at` timestamp,
	`is_verified` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT false,
	`commission_rate` decimal(5,2) NOT NULL DEFAULT '15.00',
	`total_trips` int NOT NULL DEFAULT 0,
	`rating` decimal(3,2) NOT NULL DEFAULT '5.00',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`booking_id` int NOT NULL,
	`transaction_id` varchar(100),
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'EUR',
	`method` varchar(50),
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`gateway_response` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`booking_id` int NOT NULL,
	`driver_id` int,
	`message_id` bigint NOT NULL,
	`chat_id` bigint NOT NULL,
	`status` enum('sent','accepted','expired') NOT NULL DEFAULT 'sent',
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`responded_at` timestamp,
	CONSTRAINT `telegram_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`meta_title` varchar(200),
	`meta_description` varchar(500),
	`headline` varchar(200),
	`description` text,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `zones_id` PRIMARY KEY(`id`),
	CONSTRAINT `zones_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_admin_id_admins_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_zone_id_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_driver_id_drivers_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegram_notifications` ADD CONSTRAINT `telegram_notifications_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegram_notifications` ADD CONSTRAINT `telegram_notifications_driver_id_drivers_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE no action ON UPDATE no action;