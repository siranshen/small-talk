import Image from 'next/image';
import audioPlayIcon from '@/public/icons/audio-play.svg';
import docsIcon from '@/public/icons/docs.svg';
import micIcon from '@/public/icons/mic.svg';
import plusIcon from '@/public/icons/plus.svg';
import trashbinIcon from '@/public/icons/trashbin.svg';

export default function Chat() {
  return (
    <div>
      <div className='chat-container'>
        <div className='chat-area'>
          <div className='chat-line chat-line-ai'>
            <div className='message-container'>messages</div>
          </div>
          <div className='chat-line chat-line-user'>
            <div className='message-container'>messages</div>
          </div>
          <div className='chat-line chat-line-ai'>
            <div className='message-container'>
              中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息 中文消息
            </div>
          </div>
          <div className='chat-line chat-line-user'>
            <div className='message-container'>messages messages messages</div>
          </div>
          <div className='chat-line chat-line-ai'>
            <div className='message-container'>
              <button className='audio-play-btn flex-none'>
                <Image src={audioPlayIcon} width={24} height={24} alt='play' />
              </button>
              <canvas height='48' width='400' className='audio-canvas audio-ai'></canvas>
            </div>
            <div className='message-container'>messages messages messages messages messages messages messages</div>
          </div>
          <div className='chat-line chat-line-user'>
            <div className='message-container'>
              <button className='audio-play-btn flex-none'>
                <Image src={audioPlayIcon} width={24} height={24} alt='play' />
              </button>
              <canvas height='48' width='400' className='audio-canvas audio-user'></canvas>
            </div>
            <div className='message-container'>messages messages messages messages messages messages messages</div>
          </div>
          <div className='chat-filler'></div>
        </div>
      </div>
      <div className='user-input-container'>
        <div className='user-input-area'>
          <textarea id='user-input-text' rows={1} placeholder='Type your message...'></textarea>
          <div id='user-input-button-container'>
            <button id='mic-btn' className='solid-button'>
              <Image src={micIcon} width={16} height={16} alt='mic' />
            </button>
            <button id='options-btn' className='solid-button'>
              <Image src={plusIcon} width={16} height={16} alt='options' />
            </button>
            <div id='options-tooltip' className='hidden'>
              <button>
                <span>
                  <Image src={docsIcon} width={16} height={16} alt='' />
                </span>
                Show text
              </button>
              <button>
                <span>
                  <Image src={trashbinIcon} width={16} height={16} alt='' />
                </span>
                Clear talk
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
