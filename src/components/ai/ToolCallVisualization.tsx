import { useState } from 'react';
import { Wrench, ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ToolCall, ToolResult } from '../../lib/agentApi';

interface ToolCallVisualizationProps {
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isExecuting?: boolean;
}

// Map tool names to user-friendly labels
const toolLabels: Record<string, string> = {
  list_pnl: 'P&L',
  list_enrollments: 'Enrollments',
  advisor_books: 'Advisor books',
  forward_risk: 'Forward risk',
  pipeline_facts: 'Pipeline',
  ticket_health: 'Ticket health',
  traffic_facts: 'Traffic',
  source_health: 'Source health',
  forecast_summary: 'Forecast',
  explain_page: 'This page',
  navigate: 'Navigate',
};

function getToolLabel(name: string): string {
  return toolLabels[name] || name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function parseArguments(argsString: string): Record<string, unknown> {
  try {
    return JSON.parse(argsString);
  } catch {
    return { raw: argsString };
  }
}

interface ToolCallItemProps {
  toolCall: ToolCall;
  result?: ToolResult;
  isExecuting?: boolean;
}

function ToolCallItem({ toolCall, result, isExecuting }: ToolCallItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const args = parseArguments(toolCall.function.arguments);

  const status = isExecuting
    ? 'executing'
    : result
    ? result.success
      ? 'success'
      : 'error'
    : 'pending';

  const statusColors = {
    executing: 'text-blue-500 bg-blue-50 border-blue-200',
    success: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    pending: 'text-slate-500 bg-slate-50 border-slate-200',
  };

  const StatusIcon = {
    executing: Loader2,
    success: CheckCircle,
    error: XCircle,
    pending: Wrench,
  }[status];

  return (
    <div className={`rounded-lg border ${statusColors[status]} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/5 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        )}
        <StatusIcon
          className={`w-4 h-4 flex-shrink-0 ${status === 'executing' ? 'animate-spin' : ''}`}
        />
        <span className="font-medium text-sm">{getToolLabel(toolCall.function.name)}</span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Arguments */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Parameters:</p>
            <pre className="text-xs bg-white/50 rounded p-2 overflow-x-auto">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {result && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Result:</p>
              <pre className="text-xs bg-white/50 rounded p-2 overflow-x-auto max-h-32">
                {typeof result.result === 'string'
                  ? result.result
                  : JSON.stringify(result.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ToolCallVisualization({
  toolCalls,
  toolResults,
  isExecuting,
}: ToolCallVisualizationProps) {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  // Create a map of tool call results by ID for quick lookup
  const resultsMap = new Map<string, ToolResult>();
  toolResults?.forEach(result => {
    resultsMap.set(result.tool_call_id, result);
  });

  return (
    <div className="space-y-2 my-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Wrench className="w-3 h-3" />
        <span>Tool Executions ({toolCalls.length})</span>
      </div>
      <div className="space-y-2">
        {toolCalls.map((toolCall, index) => (
          <ToolCallItem
            key={toolCall.id || index}
            toolCall={toolCall}
            result={resultsMap.get(toolCall.id)}
            isExecuting={isExecuting && !resultsMap.has(toolCall.id)}
          />
        ))}
      </div>
    </div>
  );
}
