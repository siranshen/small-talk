import { ChangeEventHandler, Ref, forwardRef } from 'react'

const Select = forwardRef(function Select(
  { label, id, children, onChange }: { label: string; id: string; children: React.ReactNode; onChange?: ChangeEventHandler<HTMLSelectElement> },
  ref: Ref<HTMLSelectElement>
) {
  return (
    <div className='mt-4'>
      <label htmlFor={id} className='block font-medium text-sm text-gray-500 mb-2'>
        {label}
      </label>
      <div className='select-wrapper'>
        <select id={id} name={id} ref={ref} className='bg-inherit' onChange={onChange}>
          {children}
        </select>
      </div>
    </div>
  )
})

export default Select
