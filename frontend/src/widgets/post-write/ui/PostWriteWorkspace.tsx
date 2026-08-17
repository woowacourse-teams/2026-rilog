'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Block } from '@blocknote/core';
import type { ComponentType } from 'react';

import { COLOG_OPTIONS_MOCK } from '@/features/post-write/lib/mock-colog-options';
import { mockPublishPost } from '@/features/post-write/lib/mock-publish-post';
import { mockUploadPostBodyFile } from '@/features/post-write/lib/mock-upload-post-body-file';
import type { PostEditorHandle, PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import type { PublicationSettings, PublishPost } from '@/features/post-write/model/post-publication';
import type { PostDocumentErrors } from '@/features/post-write/model/post-write-validation';
import { validatePostDocument } from '@/features/post-write/model/post-write-validation';
import DynamicBlockNoteEditor from '@/features/post-write/ui/DynamicBlockNoteEditor';
import PostBodyField from '@/features/post-write/ui/PostBodyField';
import PostTitleField from '@/features/post-write/ui/PostTitleField';
import PublishSettingsModal from '@/features/post-write/ui/PublishSettingsModal';
import WritePublishActionBar from '@/features/post-write/ui/WritePublishActionBar';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { buildPostDetailPath } from '@/shared/routes/app-routes';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

const DEFAULT_POST_COVER_PATH = '/images/default-post-cover.svg';

type PublishState = { status: 'idle' } | { status: 'pending' } | { status: 'error'; message: string };

interface PostWriteWorkspaceProps {
	editorComponent?: ComponentType<PostEditorProps>;
	publishPost?: PublishPost;
	uploadFile?: UploadPostBodyFile;
	navigate?: (href: string) => void;
}

const INITIAL_PUBLICATION_SETTINGS: PublicationSettings = {
	category: 'IT',
	blogId: null,
	representativeImage: null,
};

export default function PostWriteWorkspace({
	editorComponent = DynamicBlockNoteEditor,
	publishPost = mockPublishPost,
	uploadFile = mockUploadPostBodyFile,
	navigate,
}: PostWriteWorkspaceProps) {
	const router = useRouter();

	// 제목과 에디터 빈 값일 시 focus 하기 위한 용도
	const titleRef = useRef<HTMLTextAreaElement>(null);
	const editorRef = useRef<PostEditorHandle>(null);

	// 가장 최근(까지 수정된) 본문을 가리키는 ref
	const latestBlocksRef = useRef<Block[]>([]);
	// 썸네일 미리보기에 쓰이는 object URL을 가리키는 ref
	const selectedImageUrlRef = useRef<string | null>(null);

	const [title, setTitle] = useState('');
	const [isEditorReady, setIsEditorReady] = useState(false);
	const [isDirty, setIsDirty] = useState(false);
	const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
	const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
	const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

	// 발행 모달을 열었던 시점의 문서 스냅샷
	const [publicationBlocks, setPublicationBlocks] = useState<Block[]>([]);
	const [publishState, setPublishState] = useState<PublishState>({ status: 'idle' });
	const [publicationSettings, setPublicationSettings] = useState(INITIAL_PUBLICATION_SETTINGS);

	// 에러 관련 상태들
	const [documentErrors, setDocumentErrors] = useState<PostDocumentErrors>({});
	const [cologError, setCologError] = useState<string>();

	// publishState에서 모달 UI에 필요한 발행 중 여부와 에러 메시지만 꺼내서 사용 (파생 상태 관리)
	const isPublishing = publishState.status === 'pending';
	const publishError = publishState.status === 'error' ? publishState.message : undefined;

	// 작성 페이지의 guard entry를 목적지로 교체해 비동기 popstate와의 이동 경쟁을 방지
	const replaceNavigation = useCallback(
		(href: string) => {
			// 테스트 등에서 navigate를 주입했다면 Next router 대신 주입 받은 함수를 사용
			if (navigate !== undefined) {
				navigate(href);
				return;
			}

			// 실제 화면에서는 현재 history entry를 목적지로 교체
			router.replace(href);
		},
		[navigate, router],
	);

	// browser back이나 내부 링크 이동이 감지되면 작성 중인 글의 이탈 확인 모달을 여는 handler
	const handleNavigationAttempt = useCallback(() => {
		setIsLeaveModalOpen(true);
	}, []);

	// dirty 상태일 때 이탈 확인 모달을 띄우기 위한 커스텀훅
	// cancelPendingNavigation: 사용자가 계속 작성을 선택하면 보류 중인 이동을 취소하고 history guard 복구
	// continuePendingNavigation: 사용자가 이동하려던 history 또는 내부 경로로 이동하게 허용
	// clearGuardEntry: 발행 완료 후 작성 페이지의 history guard 표시를 동기적으로 제거
	const { cancelPendingNavigation, continuePendingNavigation, clearGuardEntry } = useUnsavedChangesGuard({
		isDirty,
		onNavigationAttempt: handleNavigationAttempt,
		onReplace: replaceNavigation,
	});

	// 작성 페이지에 처음 진입하면 바로 제목을 입력할 수 있도록 focus
	useEffect(() => {
		titleRef.current?.focus();
	}, []);

	// 컴포넌트가 unmount될 때 로컬 대표 이미지 미리보기에 사용한 object URL을 메모리에서 해제
	useEffect(
		() => () => {
			if (selectedImageUrlRef.current !== null) {
				URL.revokeObjectURL(selectedImageUrlRef.current);
			}
		},
		[],
	);

	// 첫 마운트 시의 handler
	const handleEditorReady = useCallback((blocks: Block[]) => {
		// 기존 blocks(빈 값 혹은 초기 본문 등 주입 받음)를 본문 ref로 설정
		latestBlocksRef.current = blocks;
		// 에디터 준비 상태로 만듦 -> 발행 버튼 활성화에 쓰임
		setIsEditorReady(true);
	}, []);

	// 제목 onChange handler
	const handleTitleChange = (nextTitle: string) => {
		// title 상태 설정
		setTitle(nextTitle);
		// dirty flag on
		setIsDirty(true);
		// 에러가 떠 있었다면 titleError을 undefined로 실시간으로 바꿔줘서 error 메시지 바로 없어지게
		setDocumentErrors((currentErrors) => ({ ...currentErrors, title: undefined }));
	};

	// 본문 onChange handler
	const handleEditorChange = useCallback((blocks: Block[]) => {
		// 본문(blocks)를 본문 ref로 설정
		latestBlocksRef.current = blocks;
		// dirty flag on
		setIsDirty(true);
		// 에러가 떠 있었다면 bodyError을 undefined로 실시간으로 바꿔줘서 error 메시지 바로 없어지게
		setDocumentErrors((currentErrors) => ({ ...currentErrors, body: undefined }));
	}, []);

	// 게시 설정 모달 opener handler
	const handleOpenPublishSettings = () => {
		// 제목과 본문(latestBlocksRef)이 유효한지(빈 값이 아닌지) 검사 후 에러 저장
		const nextErrors = validatePostDocument(title, latestBlocksRef.current);
		setDocumentErrors(nextErrors);

		if (nextErrors.title !== undefined) {
			titleRef.current?.focus();
			return;
		}

		if (nextErrors.body !== undefined) {
			editorRef.current?.focus();
			return;
		}

		// 실제 발행할 글(blocks)의 ref에서 본문글을 이제서야 state에 저장
		setPublicationBlocks([...latestBlocksRef.current]);
		setPublishState({ status: 'idle' });
		// 발행 모달 열기
		setIsPublishModalOpen(true);
	};

	// 게시 설정 모달에서 대표 이미지를 선택, 변경, 제거할 때 실행되는 handler
	const handleImageChange = (file: File | null) => {
		// 이전에 선택한 이미지의 object URL이 남아 있다면 새 URL을 만들기 전에 해제
		if (selectedImageUrlRef.current !== null) {
			URL.revokeObjectURL(selectedImageUrlRef.current);
		}

		// 선택한 로컬 파일을 썸네일에서 바로 볼 수 있도록 임시 object URL 생성
		const nextImageUrl = file === null ? null : URL.createObjectURL(file);
		// cleanup용 ref와 화면 렌더링용 state에 동일한 최신 URL 저장
		selectedImageUrlRef.current = nextImageUrl;
		setSelectedImageUrl(nextImageUrl);
		// 실제 발행에 포함할 원본 File도 발행 설정에 저장
		setPublicationSettings((currentSettings) => ({ ...currentSettings, representativeImage: file }));
	};

	// 발행 handler
	const handlePublish = async () => {
		// 이미 발행 요청 중이라면 중복 요청을 보내지 않음
		if (publishState.status === 'pending') {
			return;
		}

		if (publicationSettings.blogId === null) {
			setCologError('Co-log를 선택해 주세요.');
			return;
		}

		// 위의 예외 처리를 통과하면 발행 중 상태로 전환
		setCologError(undefined);
		setPublishState({ status: 'pending' });

		try {
			// 제목, 모달을 열었을 때 저장한 본문 스냅샷과 발행 설정을 mock 발행 함수에 전달
			const result = await publishPost({
				document: { title: title.trim(), blocks: publicationBlocks },
				settings: publicationSettings,
			});
			// 이동 경로를 먼저 검증해 실패 시 모달과 이탈 보호 상태를 그대로 유지
			const postDetailPath = buildPostDetailPath(result.slug, result.postId);

			// 발행 성공 후에는 작성 페이지를 떠나도 확인 모달이 뜨지 않도록 history guard 표시 해제
			clearGuardEntry();
			setIsDirty(false);
			setIsPublishModalOpen(false);

			// 발행이 끝난 대표 이미지 미리보기 URL을 해제하고 관련 값을 초기화
			if (selectedImageUrlRef.current !== null) {
				URL.revokeObjectURL(selectedImageUrlRef.current);
				selectedImageUrlRef.current = null;
				setSelectedImageUrl(null);
			}

			// 검증한 게시글 상세 URL로 현재 작성 history entry를 교체
			replaceNavigation(postDetailPath);
		} catch (error) {
			// 실패 상태와 메시지를 함께 저장해서 입력값은 유지한 채 모달에서 재시도할 수 있게 함
			setPublishState({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: '발행하지 못했습니다. 입력한 내용은 유지되며 다시 시도할 수 있습니다.',
			});
		}
	};

	// 게시 설정 모달을 닫을 때 이전 발행 실패 상태가 다시 노출되지 않도록 초기화
	const handleClosePublishSettings = () => {
		setIsPublishModalOpen(false);
		setPublishState({ status: 'idle' });
	};

	// 이탈 확인 모달에서 계속 작성을 선택했을 때 history guard를 복구하고 모달을 닫는 handler
	const handleCancelLeave = () => {
		cancelPendingNavigation();
		setIsLeaveModalOpen(false);
	};

	// 이탈 확인 모달에서 나가기를 선택했을 때 dirty 상태를 해제하고 원래 이동을 계속하는 handler
	const handleConfirmLeave = () => {
		setIsLeaveModalOpen(false);
		setIsDirty(false);
		void continuePendingNavigation();
	};

	return (
		<div className="min-h-dvh bg-background text-text-primary">
			<WritePublishActionBar isEditorReady={isEditorReady} onPublish={handleOpenPublishSettings} />
			<main className="mx-auto w-full max-w-4xl px-4 pt-10 pb-[calc(6.5rem+env(safe-area-inset-bottom))] min-[512px]:pb-10 sm:px-8 sm:py-16">
				<div className="min-h-136 px-5 py-8 sm:px-10 sm:py-12">
					<PostTitleField
						value={title}
						error={documentErrors.title}
						inputRef={titleRef}
						onChange={handleTitleChange}
						onEnter={() => editorRef.current?.focus()}
					/>
					<div className="my-7 h-px bg-border-default" />
					<PostBodyField
						editorComponent={editorComponent}
						editorRef={editorRef}
						error={documentErrors.body}
						onReady={handleEditorReady}
						onChange={handleEditorChange}
						uploadFile={uploadFile}
					/>
				</div>
			</main>

			<PublishSettingsModal
				open={isPublishModalOpen}
				postTitle={title.trim()}
				settings={publicationSettings}
				selectedImageUrl={selectedImageUrl}
				bodyBlocks={publicationBlocks}
				defaultImageUrl={DEFAULT_POST_COVER_PATH}
				cologOptions={COLOG_OPTIONS_MOCK}
				cologError={cologError}
				publishError={publishError}
				isPublishing={isPublishing}
				onClose={handleClosePublishSettings}
				onCategoryChange={(category) => {
					// 선택한 카테고리만 기존 발행 설정에 반영
					setPublicationSettings((currentSettings) => ({ ...currentSettings, category }));
				}}
				onCoLogChange={(blogId) => {
					// 선택한 코로그를 저장하고 기존 필수 선택 에러가 있다면 바로 제거
					setPublicationSettings((currentSettings) => ({ ...currentSettings, blogId }));
					setCologError(undefined);
				}}
				onImageChange={handleImageChange}
				onPublish={() => void handlePublish()}
			/>

			<ConfirmModal
				open={isLeaveModalOpen}
				title="작성 중인 글을 나갈까요?"
				description="저장되지 않은 내용은 복구할 수 없습니다."
				confirmLabel="나가기"
				cancelLabel="계속 작성"
				variant="danger"
				onConfirm={handleConfirmLeave}
				onCancel={handleCancelLeave}
			/>
		</div>
	);
}
