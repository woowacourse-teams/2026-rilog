import type { Metadata } from 'next';

import SignUpForm from '@/features/auth/sign-up/SignUpForm';
import PageShell from '@/shared/ui/page-shell/PageShell';

export const metadata: Metadata = {
	title: '회원가입 | Rilog',
};

export default function SignUpPage() {
	return (
		<PageShell>
			<section className="px-6 pt-20 md:px-0">
				<h1 className="text-heading-3 font-semibold">프로필 설정</h1>
				<p className="mt-2 text-body-2 text-text-secondary">
					{/* TODO: 문구 점검 */}
					처음 한 번만 설정하면 됩니다. rilog에서 사용할 이름과 주소를 정해 주세요.
				</p>
				<SignUpForm />
			</section>
		</PageShell>
	);
}
