import { isBlockNoteDocument } from '@/domains/post/lib/validate-blocknote-document';
import { apiClient, apiRequest, kyInstance } from '@/shared/api/client';
import type {
	PostCommentAnchorsResponse,
	PostCommentAnchorDeleteResponse,
	PostCommentAnchorUpdateRequest,
	PostCommentAnchorUpdateResponse,
	PostCommentAnchorCreateRequest,
	PostCommentAnchorAddRequest,
	PostCommentAnchorCreateResponse,
	PostCommentAnchorsSidebarResponse,
	PostCommentAnchorGroupResponse,
	PostCommentAnchorResponse,
	PostCommentAnchorSidebarGroupResponse,
	PostDetailRequest,
	PostDetailResponse,
	PostsCountResponse,
	PostWriteRequest,
	PostWriteResponse,
} from '@/shared/api/posts/types';
import { isRecord, parseApiJsonResponse } from '@/shared/api/response-validation';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

const isId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const isCount = (value: unknown): value is number =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null => value === null || isString(value);

const isPostWriteResponse = (value: unknown): value is PostWriteResponse =>
	isRecord(value) && isId(value.postId) && isString(value.slug) && value.slug.length > 0;

const isPostCommentAnchor = (value: unknown): value is PostCommentAnchorResponse => {
	if (!isRecord(value) || !isRecord(value.author)) return false;
	const { author } = value;
	return (
		isId(value.commentAnchorId) &&
		isString(value.content) &&
		typeof value.isEdited === 'boolean' &&
		typeof value.canEdit === 'boolean' &&
		typeof value.canDelete === 'boolean' &&
		isString(value.createdAt) &&
		isString(value.updatedAt) &&
		isId(author.userId) &&
		isString(author.nickname) &&
		isString(author.slug) &&
		isNullableString(author.profileImageUrl) &&
		typeof author.isPostAuthor === 'boolean' &&
		typeof author.isBlogMember === 'boolean'
	);
};

const isPostCommentAnchorGroup = (value: unknown): value is PostCommentAnchorGroupResponse =>
	isRecord(value) &&
	isId(value.selectionId) &&
	isRecord(value.range) &&
	isCount(value.range.startOffset) &&
	isCount(value.range.endOffset) &&
	isString(value.selectedText) &&
	(value.state === 'ACTIVE' || value.state === 'ORPHANED') &&
	isCount(value.anchorCount) &&
	Array.isArray(value.commentAnchors) &&
	value.commentAnchors.every(isPostCommentAnchor);

const isPostCommentAnchorSidebarGroup = (value: unknown): value is PostCommentAnchorSidebarGroupResponse =>
	isRecord(value) && isString(value.blockId) && isPostCommentAnchorGroup(value);

const isPostCommentAnchorsResponse = (value: unknown): value is PostCommentAnchorsResponse =>
	isRecord(value) &&
	Array.isArray(value.blocks) &&
	value.blocks.every(
		(block: unknown) =>
			isRecord(block) &&
			isString(block.blockId) &&
			Array.isArray(block.anchorGroups) &&
			block.anchorGroups.every(isPostCommentAnchorGroup),
	);

const isPostCommentAnchorsSidebarResponse = (value: unknown): value is PostCommentAnchorsSidebarResponse =>
	isRecord(value) && Array.isArray(value.anchorGroups) && value.anchorGroups.every(isPostCommentAnchorSidebarGroup);

const isPostCommentAnchorCreateResponse = (value: unknown): value is PostCommentAnchorCreateResponse =>
	isRecord(value) && isId(value.commentAnchorId);

const isPostCommentAnchorUpdateResponse = (value: unknown): value is PostCommentAnchorUpdateResponse =>
	isRecord(value) &&
	isId(value.commentAnchorId) &&
	isString(value.content) &&
	typeof value.isEdited === 'boolean' &&
	isString(value.createdAt) &&
	isString(value.updatedAt);

const isPostCommentAnchorDeleteResponse = (value: unknown): value is PostCommentAnchorDeleteResponse =>
	isRecord(value) && isId(value.commentAnchorId) && isId(value.selectionId);

const isPostDetailResponse = (value: unknown): value is PostDetailResponse => {
	if (!isRecord(value) || !isRecord(value.author) || !isRecord(value.owner) || !isRecord(value.viewerPermissions)) {
		return false;
	}
	const { author, owner, viewerPermissions } = value;
	if (
		!isString(value.title) ||
		!isBlockNoteDocument(value.content) ||
		!isString(value.publishedAt) ||
		!isNullableString(value.thumbnailImageUrl) ||
		!(value.category === '기술' || value.category === '일상' || value.category === '회고') ||
		(value.chapter !== null &&
			(!isRecord(value.chapter) ||
				!isId(value.chapter.chapterId) ||
				!isString(value.chapter.name) ||
				typeof value.chapter.order !== 'number' ||
				!Number.isFinite(value.chapter.order))) ||
		!isId(author.userId) ||
		!isString(author.slug) ||
		!isNullableString(author.profileImageUrl) ||
		(author.name !== undefined && !isString(author.name)) ||
		(author.nickname !== undefined && !isString(author.nickname)) ||
		!(owner.type === 'RILOG' || owner.type === 'COLOG') ||
		!isId(owner.blogId) ||
		!isString(owner.slug) ||
		!isString(owner.name) ||
		!isNullableString(owner.profileImageUrl) ||
		typeof viewerPermissions.canEdit !== 'boolean' ||
		typeof viewerPermissions.canDelete !== 'boolean'
	)
		return false;

	return (
		owner.type !== 'COLOG' ||
		(isNullableString(owner.coverImageUrl) && isCount(owner.memberCount) && isCount(owner.postCount))
	);
};

export const publishPost = (request: PostWriteRequest): Promise<ApiResponse<PostWriteResponse>> => {
	const { slug, ...post } = request;
	const body: PostWriteRequest = {
		slug: stripAtPrefix(slug),
		...post,
	};

	return apiRequest(async () => {
		const response = await kyInstance.post('v1/posts', { json: body });
		return parseApiJsonResponse(response, 'publish post', isPostWriteResponse);
	});
};

export const readPostsCount = () => {
	return apiClient.get<ApiResponse<PostsCountResponse>>('v1/posts/count');
};

// NOTE: 게시글 상세 조회 - posts 쪽에 있는 게 자연스럽다고 판단되어 일단 유지
export const readPostDetail = ({ slug, postId }: PostDetailRequest): Promise<ApiResponse<PostDetailResponse>> => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiRequest(async () => {
		const response = await kyInstance.get(`v1/blogs/${normalizedSlug}/posts/${postId}`);
		return parseApiJsonResponse(response, 'read post detail', isPostDetailResponse);
	});
};

export const updatePost = (postId: number, request: PostWriteRequest): Promise<ApiResponse<PostWriteResponse>> => {
	const { slug, ...post } = request;
	const body: PostWriteRequest = {
		slug: stripAtPrefix(slug),
		...post,
	};

	return apiRequest(async () => {
		const response = await kyInstance.put(`v1/posts/${postId}`, { json: body });
		return parseApiJsonResponse(response, 'update post', isPostWriteResponse);
	});
};

export const deletePost = (postId: number) => apiClient.delete(`v1/posts/${postId}`);

export const readPostCommentAnchors = (postId: number): Promise<ApiResponse<PostCommentAnchorsResponse>> =>
	apiRequest(async () => {
		const response = await kyInstance.get(`v1/posts/${postId}/comment-anchors`);
		return parseApiJsonResponse(response, 'read post comment anchors', isPostCommentAnchorsResponse);
	});

export const readPostCommentAnchorsSidebar = (
	postId: number,
): Promise<ApiResponse<PostCommentAnchorsSidebarResponse>> =>
	apiRequest(async () => {
		const response = await kyInstance.get(`v1/posts/${postId}/comment-anchors/sidebar`);
		return parseApiJsonResponse(response, 'read post comment anchors sidebar', isPostCommentAnchorsSidebarResponse);
	});

export const createPostCommentAnchor = (
	postId: number,
	request: PostCommentAnchorCreateRequest,
): Promise<ApiResponse<PostCommentAnchorCreateResponse>> =>
	apiRequest(async () => {
		const response = await kyInstance.post(`v1/posts/${postId}/comment-anchors`, { json: request });
		return parseApiJsonResponse(response, 'create post comment anchor', isPostCommentAnchorCreateResponse);
	});

export const addPostCommentAnchor = (
	postId: number,
	selectionId: number,
	request: PostCommentAnchorAddRequest,
): Promise<ApiResponse<PostCommentAnchorCreateResponse>> =>
	apiRequest(async () => {
		const response = await kyInstance.post(`v1/posts/${postId}/selections/${selectionId}/comment-anchors`, {
			json: request,
		});
		return parseApiJsonResponse(response, 'add post comment anchor', isPostCommentAnchorCreateResponse);
	});

export const updatePostCommentAnchor = (
	postId: number,
	commentAnchorId: number,
	request: PostCommentAnchorUpdateRequest,
): Promise<ApiResponse<PostCommentAnchorUpdateResponse>> =>
	apiRequest(async () => {
		const response = await kyInstance.patch(`v1/posts/${postId}/comment-anchors/${commentAnchorId}`, {
			json: request,
		});
		return parseApiJsonResponse(response, 'update post comment anchor', isPostCommentAnchorUpdateResponse);
	});

export const deletePostCommentAnchor = (
	postId: number,
	commentAnchorId: number,
): Promise<ApiResponse<PostCommentAnchorDeleteResponse>> =>
	apiRequest(async () => {
		const response = await kyInstance.delete(`v1/posts/${postId}/comment-anchors/${commentAnchorId}`);
		return parseApiJsonResponse(response, 'delete post comment anchor', isPostCommentAnchorDeleteResponse);
	});
