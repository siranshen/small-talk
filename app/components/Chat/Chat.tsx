'use client';

import ChatLineGroup from './ChatLineGroup';
import { useState } from 'react';
import { AudioChatMessage, ChatMessage } from './ChatMessage';
import ChatInput from './ChatInput';

function convertMessageRoundToChatLineGroup(round: Array<ChatMessage>): JSX.Element {
  return (
    <>
      <ChatLineGroup key={round[0].getId()} isAi message={round[0]} />
      <ChatLineGroup key={round[1].getId()} isAi={false} message={round[1]} />
    </>
  );
}

export default function Chat() {
  const [history, setHistory] = useState([
    [new ChatMessage('messages'), new ChatMessage('messages')],
    [
      new ChatMessage(
        '中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息'
      ),
      new ChatMessage('messages messages messages'),
    ],
    [
      new ChatMessage(
        '中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息'
      ),
      new ChatMessage('messages messages messages'),
    ],
    [
      new AudioChatMessage('messages messages messages messages messages messages messages', ''),
      new AudioChatMessage('messages messages messages messages messages messages messages', ''),
    ],
  ]);
  return (
    <div className='my-0 mx-auto h-full overflow-scroll'>
      <div className='h-full'>
        <div className='max-w-[650px] my-0 mx-auto p-3'>
          {history.map((round) => convertMessageRoundToChatLineGroup(round))}
          <div className='clear-both h-32'></div>
        </div>
      </div>
      <ChatInput />
    </div>
  );
}
