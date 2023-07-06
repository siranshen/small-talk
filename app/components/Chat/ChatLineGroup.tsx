import ChatLine from './ChatLine';
import { AudioChatMessage, ChatMessage } from './ChatMessage';

export default function ChatLineGroup({ message }: { message: ChatMessage }) {
  const isAi = message.isAiMessage();
  const isAudio = message.getType() === 'audio';
  return (
    <div
      className={`${
        isAi ? 'float-left items-start' : 'float-right items-end'
      } mb-4 max-w-[90%] sm:max-w-[75%] clear-both flex flex-col`}
    >
      {isAudio && <ChatLine isAi={isAi} isAudio content={(message as AudioChatMessage).getAudioSrc()} />}
      <ChatLine isAi={isAi} isAudio={false} content={message.getText()} />
    </div>
  );
}
