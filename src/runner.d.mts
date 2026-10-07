import type { AnswerModelConnector, AnswerPipelineResult, ReasoningPositionContext, RecordedMainLine, PositionAnalysisProvider, CompatiblePositionAnalysisProvider, runAnswerPipeline } from '@knights-eye-chess/ai-analysis';
import type { ProcessEngineOptions } from '@knights-eye-chess/pgn-annotator/engine';
import type { ProcessOptions, DelegatedAnswer } from './connectors.mjs';
export type AnswerJob = ({pgn: string; fen?: never} | {fen: string; pgn?: never}) & {question: string; ply?: number; scope?: 'move'|'position'|'game'|'general'|'mixed'};
export declare function prepareContext(job: AnswerJob): {context: ReasoningPositionContext; mainLine: RecordedMainLine; scope: NonNullable<AnswerJob['scope']>; question: string};
export declare function createLocalAnalyzer(options?: ProcessEngineOptions): PositionAnalysisProvider & {close(): Promise<void>};
export interface AnswerOptions {
 mode?: 'controlled'|'delegated'; connector?: AnswerModelConnector; analyzer?: CompatiblePositionAnalysisProvider;
 requestId?: string; modelName?: string; signal?: AbortSignal;
 policy?: Parameters<typeof runAnswerPipeline>[0]['policy'];
 delegated?: Partial<ProcessOptions> & {kind?: 'codex'|'claude'|'json'};
 onProgress?: (message: string) => void;
 observableTraceSink?: Parameters<typeof runAnswerPipeline>[0]['observableTraceSink'];
}
export interface ControlledAnswer {schema: 'controlled-answer/1'; mode: 'controlled'; result: AnswerPipelineResult;
 context: ReasoningPositionContext; connectorCapabilities: AnswerModelConnector['capabilities'] | null;
 qualification: {policy: string; routing: 'explicit-host-scope-not-Jev'; answerQuality: 'not-equivalence-qualified'; usage: string};}
export declare function answerQuestion(job: AnswerJob, options?: AnswerOptions): Promise<ControlledAnswer | DelegatedAnswer>;
export declare function answerBatch(jobs: Iterable<AnswerJob> | AsyncIterable<AnswerJob>, options: AnswerOptions): AsyncGenerator<ControlledAnswer | DelegatedAnswer>;
