export interface ExitHandle {
	ok: () => Promise<void>;
	bad: () => Promise<void>;
}

export type ProblemCategory = {
	easy: string[];
	medium: string[];
	hard: string[];
}
