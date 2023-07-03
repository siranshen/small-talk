import Image from 'next/image';
import barRightArrow from '@/public/icons/bar-right-arrow.svg';
import barLeftArrow from '@/public/icons/bar-left-arrow.svg';

export default function SidebarToggleButton({
  open,
  sidebarOpen,
  setSidebarOpen,
}: {
  open: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: Function;
}) {
  var buttonStates = '';
  if (open) {
    buttonStates = 'mr-[-32px]';
    if (sidebarOpen) {
      buttonStates += ' hidden';
    }
  } else if (!sidebarOpen) {
    buttonStates = 'hidden';
  }
  return (
    <button
      className={`${buttonStates} lg:hidden right-0 bg-none absolute top-1 z-30 w-auto border-none p-1`}
      onClick={() => setSidebarOpen(open)}
    >
      <Image priority src={open ? barRightArrow : barLeftArrow} width={24} height={24} alt={open ? 'open' : 'close'} />
    </button>
  );
}