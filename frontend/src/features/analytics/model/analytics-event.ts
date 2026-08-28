export type AnalyticsErrorKind = 'api' | 'http' | 'timeout' | 'network' | 'client' | 'unknown';

export interface AnalyticsErrorProperties {
	errorCode: string;
	errorKind: AnalyticsErrorKind;
}

// 로그인 진입점을 판별할 수 있음(모바일/pc)
export type LoginEntrySurface = 'sidebar' | 'mobile_header';
// 게시글 진입점이 피드인지, 블로그 프로필인지, 직접 url인지 등을 기록함으로서, 유입 경로 파악 가능 + 개선 지점 선정 가능
export type PostEntrySource = 'feed' | 'blog_profile' | 'publish_redirect' | 'direct';
// 새 글 작성과 기존 글 편집의 비중, 임시저장에서 재개하는 사용 흐름을 확인하는 데 필요
export type EditorEntrySource = 'sidebar' | 'post_detail_edit' | 'draft_list' | 'direct';
// Co-log 생성 화면에 들어온 위치, 현재는 사이드바 또는 직접 접근만 구분 가능, 추후 Co-log 생성 기능을 어디에 노출해야 효과적인지 판단할 수 있음
export type CologCreationEntrySource = 'sidebar' | 'direct';
//  사용자가 이미지를 어떻게 마련하는지 파악해 업로드 UX나 자동 대표 이미지 정책을 개선할 수 있음
export type ImageSource = 'uploaded' | 'existing' | 'body' | 'default';
// 게시글을 온전히 소비했는지 지표
export type ScrollDepthBucket = '50_percent';
// 작성한 글의 블록 수를 범주화한 값, 정확한 수 대신 구간으로 기록하면 이벤트 차원을 과도하게 늘리지 않고, 사용자가 주로 짧은 글·중간 길이 글·긴 글 중 무엇을 작성하는지 분석할 수 있음
export type BlockCountBucket = '1-5' | '6-10' | '11-20' | '21+';

export const getBlockCountBucket = (count: number): BlockCountBucket => {
	if (count <= 5) return '1-5';
	if (count <= 10) return '6-10';
	if (count <= 20) return '11-20';
	return '21+';
};
// “발행 실패”를 하나로 뭉치지 않고 원인을 분리해, 이미지 스토리지 문제인지 API 문제인지 빠르게 파악할 수 있음
export type PublishFailureStage = 'representative_image_upload' | 'publish_request' | 'publish_response';
//  발행 시도나 임시저장 시도에서 사용자가 어느 입력 단계에서 이탈하는지 분석하는 데 필요
export type PostDocumentState = 'title_only' | 'body_only' | 'title_and_body';
// 평균 시간처럼 왜곡되기 쉬운 단일 수치 대신, 빠른 작성·일반 작성·장시간 편집의 비중을 안정적으로 볼 수 있음
export type EditingTimeBucket = 'under_1m' | '1_to_5m' | '5_to_15m' | '15m_plus';
// 어느 화면에서 로딩 실패나 지연이 많이 발생하는지 분리해 볼 수 있음
export type ContentLoadSurface = 'feed' | 'blog_post_list' | 'post_editor' | 'post_detail';
// 같은 “로딩이 느리다”라도 초기 진입 문제인지 페이지네이션 문제인지, 에디터 코드 로딩 문제인지 정확히 나눠 개선하기 위해 필요
export type ContentLoadPhase =
	'initial' | 'pagination' | 'edit_initial_data' | 'draft_initial_data' | 'editor_bundle' | 'detail';

export interface AnalyticsStagedError extends Error {
	analyticsFailureStage: PublishFailureStage;
}

export const withAnalyticsFailureStage = (
	error: unknown,
	analyticsFailureStage: PublishFailureStage,
): AnalyticsStagedError =>
	Object.assign(error instanceof Error ? error : new Error('분석 대상 작업에 실패했습니다.'), {
		analyticsFailureStage,
	});

export const getAnalyticsFailureStage = (error: unknown): PublishFailureStage =>
	typeof error === 'object' && error !== null && 'analyticsFailureStage' in error
		? (error as AnalyticsStagedError).analyticsFailureStage
		: 'publish_request';
