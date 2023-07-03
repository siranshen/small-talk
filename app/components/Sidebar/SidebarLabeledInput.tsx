export default function SidebarLabeledInput({
  label,
  inputId,
  inputType,
  placeholder,
}: {
  label: string;
  inputId: string;
  inputType: string;
  placeholder: string;
}) {
  return (
    <div className='my-2 mx-0 flex items-center justify-between'>
      <label htmlFor={inputId} className='font-medium text-sm text-gray-500'>
        {label}
      </label>
      <input
        type={inputType}
        id={inputId}
        name={inputId}
        placeholder={placeholder}
        className='flex-[0_1_200px] border border-solid border-zinc-200 rounded-lg py-2 px-4 text-sm'
      />
    </div>
  );
}
