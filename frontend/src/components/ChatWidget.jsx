import React from 'react';
import { AIHealthAssistant } from './AIHealthAssistant';

export function ChatWidget({ tokenId = null, onAction = null }) {
  return <AIHealthAssistant tokenId={tokenId} onSelectDepartment={onAction} />;
}

export default ChatWidget;
