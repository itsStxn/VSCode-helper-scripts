export interface ExitHandle {
	ok:  () => Promise<void>;
	bad: () => Promise<void>;
}

export interface NavigationResult {
	language:   string;
	problemDir: string;
	classPath:  string;
}

export type DirFilter = (dirs: string[]) => string[];
