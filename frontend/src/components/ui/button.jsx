import * as React from "react";
import { useState } from "react";
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "relative overflow-hidden inline-flex items-center justify-center rounded-md text-sm font-medium border transition-all duration-200 transform focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-gray-200 dark:bg-white/10 backdrop-blur-lg text-gray-900 dark:text-white border border-gray-300 dark:border-white/20 shadow-md neon-glow hover:translate-y-[-2px] hover:shadow-neon",
        destructive:
          "bg-red-500 dark:bg-red-900/80 text-white border border-red-600 dark:border-red-700 shadow-md hover:translate-y-[-2px] hover:shadow-neon-pulse",
        outline:
          "bg-transparent text-gray-900 dark:text-white border border-gray-300 dark:border-white/30 hover:bg-gray-100 dark:hover:bg-white/5 hover:translate-y-[-2px]",
        secondary:
          "bg-gray-100 dark:bg-gray-900/70 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 shadow-md hover:translate-y-[-2px] hover:shadow-neon",
        ghost:
          "bg-transparent text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 hover:translate-y-[-2px]",
        link:
          "bg-transparent text-blue-500 dark:text-blue-300 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  const [ripples, setRipples] = useState([]);

  const createRipple = (event) => {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const rippleSize = buttonRect.width;
    const x = event.clientX - buttonRect.left - rippleSize / 2;
    const y = event.clientY - buttonRect.top - rippleSize / 2;
    const newRipple = { x, y, size: rippleSize, key: Date.now() };
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter(r => r.key !== newRipple.key));
    }, 600);
  };

  return (
    <button
      ref={ref}
      onMouseDown={createRipple}
      className={`${buttonVariants({ variant, size, className })} relative`}
      {...props}
    >
      {props.children}
      {ripples.map(ripple => (
        <span
          key={ripple.key}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            pointerEvents: 'none',
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            width: ripple.size,
            height: ripple.size,
            top: ripple.y,
            left: ripple.x,
            transform: "scale(0)",
            animation: "ripple 600ms linear"
          }}
        />
      ))}
    </button>
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
