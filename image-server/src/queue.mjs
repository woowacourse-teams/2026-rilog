import { ApiError } from './download.mjs';

// 이미지 변환을 한 번에 하나씩 실행하는 대기열. import와 압축이 각자 하나씩 만들어 쓴다.
//
// 왜 한 번에 하나인가
// - 이미지 변환(sharp)은 한 건에 수십~백수십 MiB를 쓴다. 같은 종류의 변환이 여러 건 겹치면 512MiB 컨테이너가
//   OOM으로 죽을 수 있어, 종류마다 동시에 1건만 돌린다. import 1건과 압축 1건은 서로 다른 대기열이라 겹칠 수 있고,
//   두 변환 모두 원본을 줄여 처리하므로 겹쳐도 한도 안에 들어온다.
//
// 동작 순서
// 1. 아무것도 실행 중이 아니면 바로 실행한다.
// 2. 실행 중이면 대기열 끝에 줄을 세운다(먼저 온 요청이 먼저 실행된다).
// 3. 대기열이 maxWaiting만큼 차 있으면 기다리게 하지 않고 바로 BUSY(429)로 거절한다.
//    기다려도 호출자의 시한 안에 끝낼 수 없는 요청을 붙잡고 있지 않기 위해서다.
// 4. 기다리는 동안 signal이 끝나면(시한 초과, 호출자 연결 끊김) 대기열에서 빠지고 실행하지 않는다.
// 5. 작업이 끝나면 성공이든 실패든 다음 대기 작업을 꺼낸다. finally에서 꺼내므로 실패한 작업이 자리를 막지 않는다.
//
// 이미 실행을 시작한 작업은 signal이 끝나도 중간에 멈추지 않는다. sharp 변환에는 별도의 timeout이 있다.
// Node는 이 코드를 한 스레드에서 실행하므로 active와 waiting을 바꾸는 사이에 다른 요청이 끼어들지 않아 잠금이 필요 없다.
export function createJobQueue({ maxWaiting }) {
  let active = false;
  const waiting = [];

  // 실행 중이던 작업이 끝났을 때 부른다. 기다리는 작업이 있으면 자리를 넘기고, 없으면 비운다.
  function release() {
    const next = waiting.shift();
    if (next) next.start();
    else active = false;
  }

  async function execute(job) {
    try { return await job(); }
    finally { release(); }
  }

  // job의 결과를 돌려주는 Promise를 반환한다. 이미 끝난 signal이거나 대기열이 가득 차면 즉시 예외를 던진다.
  return function run(job, signal) {
    signal.throwIfAborted();
    if (!active) {
      active = true;
      return execute(job);
    }
    if (waiting.length >= maxWaiting) throw new ApiError(429, 'BUSY', '잠시 후 다시 시도해주세요.');
    return new Promise((resolve, reject) => {
      // 기다리는 중 signal이 끝나면 대기열에서 자기 자리를 지우고 실패로 끝난다.
      const onAbort = () => {
        waiting.splice(waiting.indexOf(entry), 1);
        reject(signal.reason);
      };
      const entry = {
        // 차례가 오면 release()가 부른다. 실행을 시작했으므로 더 이상 signal로 대기열에서 빠지지 않는다.
        start: () => {
          signal.removeEventListener('abort', onAbort);
          execute(job).then(resolve, reject);
        },
      };
      signal.addEventListener('abort', onAbort, { once: true });
      waiting.push(entry);
    });
  };
}
