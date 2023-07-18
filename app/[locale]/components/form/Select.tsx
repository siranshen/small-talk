export function Option({ value, text }: { value: string; text: string }) {
  return (
    <option value={value} className='bg-white'>
      {text}
    </option>
  )
}

export default function Select({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='mt-2 flex items-center'>
      <span className='font-medium text-gray-500 mr-4 flex-[0_0_80px]'>{label}</span>
      <div className='select-wrapper flex-[0_1_75%]'>
        <select id='system-lang' name='system-lang'>
          {children}
        </select>
      </div>
    </div>
  )
}
