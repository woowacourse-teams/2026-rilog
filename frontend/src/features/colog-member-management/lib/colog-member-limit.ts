export const MAX_COLOG_MEMBER_COUNT = 20;

export const willExceedCologMemberLimit = (currentMemberCount: number, candidateCount: number) =>
	currentMemberCount + candidateCount > MAX_COLOG_MEMBER_COUNT;
