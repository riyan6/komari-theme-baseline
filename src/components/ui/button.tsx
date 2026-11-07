import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white",
  {
    variants: {
      variant: {
        default:
          "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 border border-transparent",
        destructive:
          "bg-[#E5001C] text-white hover:bg-[#c20017] border border-transparent",
        outline:
          "border border-[#E5E5E5] bg-white text-black hover:border-black dark:border-[#262626] dark:bg-[#0A0A0A] dark:text-[#F2F2F2] dark:hover:border-white", 
        secondary:
          "border border-[#E5E5E5] bg-[#F7F7F7] text-black hover:border-black dark:border-[#262626] dark:bg-[#141414] dark:text-[#F2F2F2]",
        ghost:
          "text-[#6B6B6B] hover:text-black dark:text-[#8C8C8C] dark:hover:text-white border-0",
        link: "text-black underline-offset-4 hover:underline dark:text-white",
      },
      size: {
        default: "h-[36px] px-4",
        sm: "h-[32px] px-3 text-xs",
        lg: "h-[40px] px-6 text-sm",
        icon: "size-[36px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn("km-ui-button", buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
