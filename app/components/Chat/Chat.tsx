'use client';

import ChatLineGroup from './ChatLineGroup';
import { useState } from 'react';
import { AudioChatMessage, ChatMessage } from './ChatMessage';
import ChatInput from './ChatInput';

export default function Chat() {
  const [history, setHistory] = useState([
    new ChatMessage('messages', true),
    new ChatMessage('messages', false),
    new ChatMessage(
      '中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息', true
    ),
    new ChatMessage('messages messages messages', false),
    new ChatMessage(
      '中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息', true
    ),
    new ChatMessage('messages messages messages', false),
    new AudioChatMessage('messages messages messages messages messages messages messages', true, ''),
    new AudioChatMessage('messages messages messages messages messages messages messages', false, ''),
  ]);
  return (
    <div className='my-0 mx-auto h-full overflow-scroll'>
      <div className='h-full'>
        <div className='max-w-[650px] my-0 mx-auto p-3'>
          {history.map((msg) => <ChatLineGroup key={msg.getId()} message={msg} />)}
          <div className='clear-both h-32'></div>
        </div>
      </div>
      <ChatInput />
    </div>
  );
}
