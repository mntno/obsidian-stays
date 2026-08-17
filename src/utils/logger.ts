import { Bln, Str } from "#/utils/ts";

type LogLevel = "trace" | "debug" | "log" | "info" | "warn" | "error";

// Dev-tools mapping:
// 	verbose: debug
// 	info: trace, log, info
// 	warn: warn
// 	error: error, assert

/**
 * Each category's config sets a level — e.g. debug, info, trace — which acts as a minimum severity.
 * A category set to level: "info" will show warn and error messages
 */
const CATEGORY_CONFIG = {
	trace: { enabled: true, level: "trace" },
	console: { enabled: true, level: "debug", label: false },

	setting: {
		enabled: true,
		level: "trace",
	},

	cat2: {
		enabled: true,
		level: "trace",
	},
} satisfies Record<string, { enabled: boolean; level: LogLevel; label?: boolean }>;

const LEVEL_RANK: Record<LogLevel, number> = { trace: 0, debug: 1, log: 2, info: 3, warn: 4, error: 5 };
const ALL_LEVELS: LogLevel[] = ["trace", "debug", "log", "info", "warn", "error"];

const isProduction = process.env["NODE_ENV"] === "production";
const realConsole: Console = console;

function noop(): void { }

function getCallerLabel(): string {
	const stack = new Error().stack;

	if (stack === undefined)
		return Str.empty;
	const line = stack.split("\n")[3];
	if (line === undefined)
		return Str.empty;
	const isConstructor = /at\s+new\s+/.test(line);
	const match = line.match(/at\s+(?:new\s+)?([^\s(]+)/);
	if (match === null)
		return Str.empty;

	const name = match[1]?.replace(/^_+/, Str.empty) ?? Str.empty;
	return isConstructor ? `${name}:constructor` : name.replace(".", ":");
}

class CategoryLogger {

	public t: Console["trace"] = noop;
	public d: Console["debug"] = noop;
	public l: Console["log"] = noop;
	public i: Console["info"] = noop;
	public w: Console["warn"] = noop;
	public e: Console["error"] = noop;

	public static create(category: keyof typeof CATEGORY_CONFIG): CategoryLogger {
		return new CategoryLogger(category);
	}

	public constructor(category: keyof typeof CATEGORY_CONFIG) {
		const prefix = `[${category}]${Str.tab}`;
		const cfg: { enabled: boolean; level: LogLevel; label?: boolean } = CATEGORY_CONFIG[category];

		const bound: {
			trace: Console["trace"];
			debug: Console["debug"];
			log: Console["log"];
			info: Console["info"];
			warn: Console["warn"];
			error: Console["error"];
		} = {
			trace: noop, debug: noop, log: noop, info: noop, warn: noop, error: noop,
		};

		for (const l of ALL_LEVELS) {
			const shouldLog = isProduction ? l === "error" : cfg.enabled && LEVEL_RANK[l] >= LEVEL_RANK[cfg.level];

			if (l === "trace") {
				bound.trace = shouldLog
					? Bln.isFalse(cfg.label)
						? (...args: unknown[]) => { realConsole.trace(prefix, ...args); }
						:	(...args: unknown[]) => { realConsole.trace(prefix, getCallerLabel(), ...args); }
					: noop;
				continue;
			}

			bound[l] = shouldLog ? realConsole[l].bind(realConsole, prefix) : noop;
		}

		this.t = bound.trace;
		this.d = bound.debug;
		this.l = bound.log;
		this.i = bound.info;
		this.w = bound.warn;
		this.e = bound.error;
	}
}

// Normal console usage, eg: console.log
const c = CategoryLogger.create("console");

export const log = {
	t: CategoryLogger.create("trace").t,
	d: c.d,
	l: c.l,
	i: c.i,
	w: realConsole.warn,
	e: realConsole.error,
	assert: realConsole.assert,
	catch: realConsole.error,

	setting: CategoryLogger.create("setting"),
	cat2: CategoryLogger.create("cat2"),

	tab: Str.tab,
	lfTab: Str.lf + Str.tab,
};
