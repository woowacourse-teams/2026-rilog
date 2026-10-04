package kr.rilog.domain.post.view;

import kr.rilog.domain.post.exception.PostException;

import java.util.concurrent.Semaphore;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_CAPACITY_EXCEEDED;

final class ViewerRecordCapacity {

    private final Semaphore slots;

    ViewerRecordCapacity(int maximum) {
        this.slots = new Semaphore(maximum);
    }

    void reserve() {
        if (!slots.tryAcquire()) {
            throw new PostException(POST_VIEW_CAPACITY_EXCEEDED);
        }
    }

    void release(int count) {
        slots.release(count);
    }
}
