import { Ref, forwardRef } from 'react'

const TextArea = forwardRef(function Select(
  {
    label,
    id,
    placeholder,
    rows = 3,
    value = '',
  }: { label: string; id: string; placeholder: string; rows?: number; value?: string },
  ref: Ref<HTMLTextAreaElement>
) {
  return (
    <div className='mt-4'>
      <label htmlFor={id} className='block font-medium text-sm text-gray-500 mb-2'>
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        ref={ref}
        rows={rows}
        className='resize-none rounded-lg border border-solid border-zinc-300 w-full bg-inherit py-2 px-3 read-only:bg-gray-50'
        placeholder={placeholder}
        {...(value ? { value: value, readOnly: true } : {})}
      ></textarea>
    </div>
  )
})

export default TextArea
