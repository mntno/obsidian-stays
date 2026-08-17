import type { TFile, TFolder } from "obsidian";

export interface BookingInfo {
	/** The selected person's full name (from frontmatter `name`). */
	personName: string;
	/** The selected person's file. */
	personFile: TFile;
	/** Display title. */
	title: string;
	/** Check-in date. */
	date: Date;
	/** Check-out date. If omitted, the booking is for a single night. */
	endDate?: Date;
	/** Google Form URL, if provided. */
	applicationFormUrl?: string;
}

export interface AddBookingResult {
	didCancel: boolean;
	error?: Error;
	bookingInfo?: BookingInfo;
	/** The room folder name. */
	roomName?: string;
	/** The room folder object. */
	roomFolder?: TFolder;
}
