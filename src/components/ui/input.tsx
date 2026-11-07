import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-[36px] w-full min-w-0 border border-[#E5E5E5] bg-white px-3 py-1 text-xs text-black outline-none placeholder:text-[#6B6B6B] focus:border-black focus:outline-2 focus:outline-offset-2 focus:outline-black disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#262626] dark:bg-[#0A0A0A] dark:text-[#F2F2F2] dark:placeholder:text-[#8C8C8C] dark:focus:border-[#F2F2F2] dark:focus:outline-[#F2F2F2]',
        className
      )}
      {...props}
    />
  )
}

export { Input }
