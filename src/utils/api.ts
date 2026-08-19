import { apiVersion, App, normalizePath, TAbstractFile, TFile, TFolder, Vault } from "obsidian";


export const Api = {

	get version(): string { return apiVersion; },

	App: {
		is: (app: unknown): app is App => app instanceof App,
	},

	File: {
    is: (file: unknown): file is TFile => file instanceof TFile,
		isMarkdown: (file: TAbstractFile): file is TFile => Api.File.is(file) && file.extension === "md",
    get: (vault: Vault, path: string): TFile | null => vault.getFileByPath(path),
		exists: (vault: Vault, path: string): boolean => Api.File.get(vault, path) !== null,
	},

	Folder: {
		is: (folder: unknown): folder is TFolder => folder instanceof TFolder,
		isRoot: (folder: TFolder): boolean => folder.isRoot(),
		isRootPath: (vault: Vault, path: string, isPathNormalized: boolean): boolean =>
			vault.getRoot().path === (isPathNormalized ? path : normalizePath(path)),

		/** @returns The folder at the given path, or `null` if it does not exist. */
		get: (vault: Vault, path: string): TFolder | null => vault.getFolderByPath(path),

		exists: (vault: Vault, path: string): boolean => Api.Folder.get(vault, path) !== null,

		/** @returns Direct child folders of the folder at the given path. */
		getChildren: (vault: Vault, path: string): TFolder[] => {
			const folder = Api.Folder.get(vault, path);
			return folder !== null ? folder.children.filter(Api.Folder.is) : [];
		},
	},

	Frontmatter: {
		update: (app: App, file: TFile, fn: (fm: Record<string, unknown>) => void): Promise<void> =>
			app.fileManager.processFrontMatter(file, fn),
	},

};
