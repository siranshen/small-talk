import { Ref, forwardRef } from 'react'

const Select = forwardRef(function Select(
  { label, id, children }: { label: string; id: string; children: React.ReactNode },
  ref: Ref<HTMLSelectElement>
) {
  return (
    <div className='mt-4'>
      <label htmlFor={id} className='block font-medium text-sm text-gray-500 mb-2'>
        {label}
      </label>
      <div className='select-wrapper'>
        <select id={id} name={id} ref={ref} className='bg-inherit'>
          {children}
        </select>
      </div>
    </div>
  )
})

export default Select
