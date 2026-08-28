module.exports = {
	apps: [
		{
			name: 'rilog-next',
			script: 'node_modules/next/dist/bin/next',
			args: 'start',
			cwd: '/home/ubuntu/rilog-next',

			// 실행 방식
			exec_mode: 'fork', // ARM 소형 인스턴스(t4g.micro 등)라 cluster 대신 fork 권장
			instances: 1,

			// 환경 변수
			env: {
				NODE_ENV: 'production',
				PORT: 3000,
			},

			// 메모리 안전장치 — 이 이상 쓰면 pm2가 자동으로 재시작
			max_memory_restart: '400M',

			// 비정상 종료 시 자동 재시작 정책
			autorestart: true,
			max_restarts: 10,
			min_uptime: '10s', // 10초도 못 버티고 죽으면 무한 재시작 방지

			// 로그
			error_file: '/home/ubuntu/logs/rilog-next-error.log',
			out_file: '/home/ubuntu/logs/rilog-next-out.log',
			time: true, // 로그에 타임스탬프 추가
			merge_logs: true,
		},
	],
};
