'use client';

import { useMyCologsOverviewQuery } from '@/shared/api/users/queries/my-cologs-overview/use-query';

import CologCreateForm from './CologCreateForm';

const MAX_COLOG_COUNT_PER_USER = 10;
const COLOG_CREATE_LIMIT_NOTICE_ID = 'colog-create-limit-notice';

export default function CologCreateEligibility() {
	const myCologCountQuery = useMyCologsOverviewQuery({
		select: (response) => response.data?.length ?? 0,
	});
	const hasReachedCologLimit =
		myCologCountQuery.data !== undefined && myCologCountQuery.data >= MAX_COLOG_COUNT_PER_USER;

	return (
		<>
			{hasReachedCologLimit && (
				<p
					id={COLOG_CREATE_LIMIT_NOTICE_ID}
					className="mt-6 rounded-md border border-danger-border bg-danger-soft p-4 text-body-2 break-keep text-danger-text"
					role="status"
				>
					현재 참여할 수 있는 Colog가 최대 개수인 {MAX_COLOG_COUNT_PER_USER}개에 도달했어요. 새 팀을 만들려면 참여 중인
					Colog 수를 줄여 주세요.
				</p>
			)}

			<CologCreateForm
				isCreationDisabled={hasReachedCologLimit}
				creationDisabledDescriptionId={hasReachedCologLimit ? COLOG_CREATE_LIMIT_NOTICE_ID : undefined}
			/>
		</>
	);
}
