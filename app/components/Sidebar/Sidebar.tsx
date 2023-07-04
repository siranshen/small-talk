'use client';

import Image from 'next/image';

import logo from '@/public/icons/logo.svg';
import { useState } from 'react';
import SidebarToggleButton from './SidebarToggleButton';
import SidebarLabeledInput from './SidebarLabeledInput';

export default function Sidebar() {
  const [isOpen, setOpen] = useState<boolean>(false);
  return (
    <>
      <div
        className={`${
          isOpen ? 'opacity-30 h-full [transition:opacity_300ms]' : 'opacity-0 h-0 [transition:opacity_300ms,height_1ms_300ms]'
        } bg-black fixed lg:hidden inset-0 z-10`}
        onClick={() => setOpen(false)}
      ></div>
      <div
        className={`${
          isOpen ? 'translate-x-0' : 'translate-x-[-100%]'
        } lg:translate-x-0 transition-transform duration-300 flex-[0_1_300px] h-full fixed top-0 left-0 z-10 lg:static lg:flex`}
      >
        <div className='max-w-[300px] h-full relative z-20 bg-zinc-100 border-r border-solid border-b-zinc-200 p-4 flex flex-col overflow-x-visible'>
          <SidebarToggleButton open sidebarOpen={isOpen} setSidebarOpen={setOpen} />
          <SidebarToggleButton open={false} sidebarOpen={isOpen} setSidebarOpen={setOpen} />

          <div className='text-2xl font-[800] my-4 mx-0 flex'>
            <div className='flex-[0_0_1.5rem] mr-3 flex items-center'>
              <Image priority src={logo} alt='logo' />
            </div>
            <span>SmallTalk</span>
          </div>

          <div className='mb-4 leading-6'>
            Welcome to SmallTalk (TBD 😅)! This is where you get to practice your foreign or second language skills with an AI.
          </div>
          <div className='mb-4 leading-6'>Please enter your API settings below to get started.</div>
          <div className='mb-4 leading-6'>
            <div className='font-[600] before:content-["▶_"]'>OpenAI</div>
            <SidebarLabeledInput label='API Key' inputId='openai-key' inputType='password' placeholder='sk-xxxxxxx' />
            <SidebarLabeledInput label='Model' inputId='openai-model' inputType='text' placeholder='gpt-3.5-turbo-0613' />
          </div>
          <div className='mb-4 leading-6'>
            <div className='font-[600] before:content-["▶_"]'>Azure Speech</div>
            <SidebarLabeledInput label='API Key' inputId='azure-key' inputType='password' placeholder='xxxxxxxxxx' />
            <SidebarLabeledInput label='Region' inputId='azure-region' inputType='text' placeholder='eastasia' />
          </div>
          <div className='mb-4 leading-6'>
            <div className='flex justify-around mt-1'>
              <button className='flex-[0_1_90%] solid-button'>Save Locally</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
