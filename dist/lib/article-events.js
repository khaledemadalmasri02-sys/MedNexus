import { EventEmitter } from "events";
class ArticleEventBus {
    emitter = new EventEmitter();
    constructor() {
        this.emitter.setMaxListeners(0);
    }
    emit(jobId, event) {
        this.emitter.emit(`job:${jobId}`, event);
    }
    subscribe(jobId, handler) {
        const evt = `job:${jobId}`;
        this.emitter.on(evt, handler);
        return () => this.emitter.off(evt, handler);
    }
    removeAll(jobId) {
        this.emitter.removeAllListeners(`job:${jobId}`);
    }
}
export const articleEvents = new ArticleEventBus();
//# sourceMappingURL=article-events.js.map