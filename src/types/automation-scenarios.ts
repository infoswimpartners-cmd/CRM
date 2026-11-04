/**
 * Make風 自動配信シナリオ管理 型定義
 */

export type ScenarioStatus = 'active' | 'draft' | 'paused';

export interface ScenarioVariable {
    key: string;
    label: string;
    example: string;
}

export interface AutomationScenario {
    id: string;
    name: string;
    category: 'post_lesson' | 'cart_recovery' | 'activity' | 'reminder' | 'step';
    categoryLabel: string;
    description: string;
    trigger: string;
    timing: string;
    target: string;
    status: ScenarioStatus;
    statusLabel: string;
    channels: ('line' | 'gchat' | 'email')[];
    template: string;
    variables: ScenarioVariable[];
    defaultTemplate: string;
    extraSettings?: {
        gchatWebhookUrl?: string | null;
        feedbackMode?: 'draft' | 'auto_send' | 'disabled';
        enableAiNaturalize?: boolean;
        inactiveHours?: number;
    };
    updatedAt?: string;
}

export interface SaveScenarioConfigParams {
    scenarioId: string;
    status: ScenarioStatus;
    template: string;
    extraSettings?: AutomationScenario['extraSettings'];
}
