import type { AnswerModelConnector, AnswerTurnRequest } from '@knights-eye-chess/ai-analysis';
export declare const TURN_SCHEMA: 'knights-eye/model-turn/1';
export interface ProcessOptions {
 command: string; args?: string[]; timeoutMs?: number; maxInputBytes?: number; maxOutputBytes?: number; cwd?: string;
 spawnProcess?: typeof import('node:child_process').spawn;
}
export type CliOptions = Partial<ProcessOptions> & { model?: string };
export declare function createJsonProcessConnector(options: ProcessOptions): AnswerModelConnector;
export declare function createCodexConnector(options?: CliOptions): AnswerModelConnector;
export declare function createClaudeConnector(options?: CliOptions): AnswerModelConnector;
export interface ResumableConnector extends AnswerModelConnector {
 pendingCount(): number;
 resume(id: string, response: {text: string; toolCalls: Array<{toolCallId: string; toolName: string; arguments?: string; input?: Record<string, unknown>}>; usage?: {inputTokens?: number; outputTokens?: number}}): void;
}
export declare function createResumableConnector(onRequest: (turn: {id: string; request: AnswerTurnRequest}) => void): ResumableConnector;
export interface DelegatedAnswer { schema: 'delegated-answer/1'; mode: 'delegated'; text: string;
 qualification: { investigationLoop: 'external-agent-owned'; referenceValidation: 'not-run'; answerQuality: 'unqualified' }; }
export declare function runDelegated(options: Partial<ProcessOptions> & {kind?: 'codex'|'claude'|'json'; context: unknown; question: string; signal?: AbortSignal}): Promise<DelegatedAnswer>;
