export interface ExitHandle {
	ok:  () => Promise<void>;
	bad: () => Promise<void>;
}

export interface References {
	instructions: string;
	templates:    string;
}

export interface ProblemData {
	title:   string;
	content: string;
}

export interface SlugMap {
	[title: string]: string;
}

export interface SlugCache {
	value: SlugMap;
}

export interface ProblemsCache {
	value: { [slug: string]: ProblemData };
}

interface LeetCodeQuestion {
	title:     string;
	titleSlug: string;
}

export interface LeetCodeQuestionResponse {
	data: {
		allQuestionsRaw: LeetCodeQuestion[];
	};
}

export interface LeetCodeProblemResponse {
	data: {
		question: { content: string } | null;
	};
}
