import * as React from "react";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={`w-full rounded-md border-b-2 bg-transparent px-3 py-2 text-sm text-white placeholder-white/60 focus:outline-none focus:border-neon focus:shadow-cyber placeholder-animate ${className}`}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };