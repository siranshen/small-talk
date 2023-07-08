import Chat from './components/Chat/Chat';
import Sidebar from './components/Sidebar/Sidebar';

export default function Home() {
  return (
    <div className='min-w-[350px] h-full flex'>
      <Sidebar />
      {/* overflow-hidden prevents sticky div from jumping */}
      <main className='flex-1 h-full relative overflow-hidden'>
        <header className='sticky top-0 left-0 w-full h-[2.5rem] border-b border-solid border-b-[--secondary-theme-color] lg:border-none flex items-center justify-around font-medium'>
          <div className='after:content-["_💬"]'>Practicing free talk</div>
        </header>
        <Chat />
      </main>
    </div>
  );
}
