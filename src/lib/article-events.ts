import { EventEmitter } from "events";

interface ArticleJobEvent {
  status: string;
  progress: number;
  outline?: unknown;
  contentMarkdown?: string;
  final?: boolean;
  error?: string;
}

class ArticleEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  emit(jobId: string, event: ArticleJobEvent): void {
    this.emitter.emit(`job:${jobId}`, event);
  }

  subscribe(jobId: string, handler: (event: ArticleJobEvent) => void): () => void {
    const evt = `job:${jobId}`;
    this.emitter.on(evt, handler);
    return () => this.emitter.off(evt, handler);
  }

  removeAll(jobId: string): void {
    this.emitter.removeAllListeners(`job:${jobId}`);
  }
}

export const articleEvents = new ArticleEventBus();
