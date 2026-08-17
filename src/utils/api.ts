import { apiVersion, App, normalizePath, TFolder, Vault } from "obsidian";


export const Api = {

	get version(): string { return apiVersion; },

	App: {
		is: (app: unknown): app is App => app instanceof App,
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

};
