import { Ref, forwardRef } from 'react'

const TextArea = forwardRef(function Select(
  { label, id, placeholder }: { label: string; id: string; placeholder: string },
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
        rows={4}
        className='resize-none rounded-lg border border-solid border-zinc-300 w-full bg-inherit py-2 px-3'
        placeholder={placeholder}
      ></textarea>
    </div>
  )
})

export default TextArea
