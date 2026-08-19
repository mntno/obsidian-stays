export const Bln = {
	is: (value: unknown): value is boolean => typeof value === "boolean",
	/** @returns `true` if {@link value} is a `boolean` and its value is `true`. */
	isTrue: (value: unknown): value is boolean => Bln.is(value) && value === true,
	/** @returns `true` if {@link value} is a `boolean` and its value is `false`. */
	isFalse: (value: unknown): value is boolean => Bln.is(value) && value === false,
} as const;

export const Str = {
	empty: "",
	space: " ",
	lf: "\n",
	tab: "\t",

	/**
		* Checks whether `value` is a string.
		* @param value The value to check.
		* @returns `true` if `value` is a string, otherwise `false`.
		*/
	is: (value: unknown): value is string => typeof value === "string",

	/**
		* Checks whether `value` is a non-empty string.
		* @param value The value to check.
		* @returns `true` if `value` is a string with at least one character, otherwise `false`.
		*/
	isNonEmpty: (value: unknown): value is string => typeof value === "string" && value !== Str.empty,

	/**
		* Checks whether `value` is a string that is non-empty after trimming.
		* @param value The value to check.
		* @returns `true` if `value` is a string that is non-empty after trimming, otherwise `false`.
		*/
	isTrimmedNonEmpty: (value: unknown): value is string => Str.isNonEmpty(value) && value.trim() !== Str.empty,

	/**
		* Returns `value` if it is a non-empty string, otherwise `undefined`.
		* @param value The value to check.
		* @returns The original string if non-empty, else `undefined`.
		*/
	nonEmpty: (value: unknown): string | undefined => Str.isNonEmpty(value) ? value : undefined,

	/**
		* Returns the trimmed `value` if it is a non-empty string, otherwise `undefined`.
		* @param value The value to check.
		* @returns The trimmed string if non-empty, else `undefined`.
		*/
	trimmedNonEmpty: (value: unknown): string | undefined => Str.is(value) ? Str.nonEmpty(value.trim()) : undefined,
} as const;
