import React from 'react';
import type { ToolExecutionData } from '../../types';
import { useApp } from '../../state/AppContext';
import { parseToolAction, CodexToolRow } from './CodexExecutionView';

export const ToolExecutionView: React.FC<{
  tool: ToolExecutionData;
  specialistName?: string;
  modelId?: string;
}> = ({ tool, specialistName, modelId }) => {
  const { theme } = useApp();
  const isLight = theme === 'light';
  const action = parseToolAction(tool, 'tool', specialistName, modelId);

  return (
    <div className="my-0.5" data-testid="tool-execution-view">
      <CodexToolRow action={action} isLight={isLight} />
    </div>
  );
};
