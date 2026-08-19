export interface PersonalInfo {
	firstName: string;
	middleNames: string[];
	lastName: string;
	/** All the names of the person. This allows the file name to be different. */
	fullName?: string;
	gender?: string;
	dateOfBirth?: Date;
	isMonastic: boolean;
}

export interface Contact {
	email?: string;
	phone?: string;
	notes?: string;
}

export interface AddPersonResult {
	error?: Error;
	personalInfo?: PersonalInfo;
	/** `null` when the address prompt was skipped or cancelled. */
	fullAddress?: string | null;
	/** `null` when the contact prompt was cancelled. */
	contact?: Contact | null;
}
