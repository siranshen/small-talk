import DocsIcon from '@/public/icons/docs.svg';
import MicIcon from '@/public/icons/mic.svg';
import PlusIcon from '@/public/icons/plus.svg';
import TrashbinIcon from '@/public/icons/trashbin.svg';
import { useState } from 'react';
import styles from './Chat.module.css';

function handleTextInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
  e.currentTarget.style.height = '1px';
  e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
}

function TooltipItem({ icon, text }: { icon: JSX.Element; text: string }) {
  return (
    <button className='border-none rounded-md bg-white px-2 py-1 text-left text-sm text-inherit flex items-center hover:bg-gray-100'>
      <span className='h-4 mr-2'>{icon}</span>
      {text}
    </button>
  );
}

export default function ChatInput() {
  const [isTooltipOpen, setTooltipOpen] = useState(false);
  return (
    <div
      className={`${styles['gradient-to-top']} absolute bottom-0 bg-white border-t border-solid border-t-zinc-200 w-full p-4 md:border-none md:w-[calc(100%-32px)] md:my-0 md:mx-4 md:pt-8 md:px-4 md:pb-6`}
    >
      <div className='relative max-w-[650px] my-0 mx-auto bg-white border border-solid border-zinc-200 rounded-[2rem] p-5 shadow-[0_0_10px_rgba(0,0,0,.1)] hover:shadow-[0_0_10px_rgba(0,0,0,.15)] flex items-stretch'>
        <textarea
          rows={1}
          placeholder='Type your message...'
          className='flex-1 border-none resize-none leading-5 max-h-24 mr-[4.75rem] focus:outline-0'
          onInput={handleTextInput}
        ></textarea>
        <div className='absolute flex right-[calc(0.85rem+1px)] bottom-[calc(0.8rem+1px)]'>
          <button id='mic-btn' className='solid-button mr-2'>
            <MicIcon width={16} height={16} alt='mic' />
          </button>
          <button
            id='options-btn'
            className={`${isTooltipOpen ? 'rotate-45' : ''} solid-button transition-transform duration-300`}
            onClick={() => setTooltipOpen(!isTooltipOpen)}
          >
            <PlusIcon width={16} height={16} alt='options' />
          </button>
          <div
            id='options-tooltip'
            className={`${
              isTooltipOpen ? '' : 'opacity-0 scale-0'
            } absolute bottom-[100%] right-4 z-30 mb-2 rounded-lg rounded-br-none bg-white border border-solid border-zinc-200 shadow-[0_0_10px_rgba(0,0,0,.1)] hover:shadow-[0_0_10px_rgba(0,0,0,.15)] w-[160px] flex flex-col p-2 origin-bottom-right transition-all duration-300`}
          >
            <TooltipItem icon={<DocsIcon width={16} height={16} alt='' />} text='Show text' />
            <TooltipItem icon={<TrashbinIcon width={16} height={16} alt='' />} text='Clear talk' />
          </div>
        </div>
      </div>
    </div>
  );
}
