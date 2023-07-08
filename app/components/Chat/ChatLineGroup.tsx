import { ChatLine, LoadingChatLine } from './ChatLine'
import { AudioChatMessage, ChatMessage } from '../../utils/chat-message'

function ChatLineGroupLayout({ isAi, children }: { isAi: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`${
        isAi ? 'float-left items-start' : 'float-right items-end'
      } mb-4 max-w-[90%] sm:max-w-[75%] clear-both flex flex-col`}
    >
      {children}
    </div>
  )
}

export function ChatLineGroup({ message }: { message: ChatMessage }) {
  const isAi = message.isAiMessage()
  const isAudio = message.getType() === 'audio'
  return (
    <ChatLineGroupLayout isAi={isAi}>
      {isAudio && <ChatLine isAi={isAi} isAudio content={(message as AudioChatMessage).getAudioSrc()} />}
      <ChatLine isAi={isAi} isAudio={false} content={message.getText()} />
    </ChatLineGroupLayout>
  )
}

export function LoadingChatLineGroup({ isAi }: { isAi: boolean }) {
  return (
    <ChatLineGroupLayout isAi={isAi}>
      <LoadingChatLine isAi={isAi} />
    </ChatLineGroupLayout>
  )
}
