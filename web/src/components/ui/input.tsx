import React from 'react';
import { Eye, EyeOff, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'> & {
    showEye?: boolean;
  }
>(({ className, type, showEye, ...props }, ref) => {
  const [inputType, setInputType] = useState(type);
  const [value, setValue] = useState(props.value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof props.value !== 'undefined') setValue(props.value);
  }, [props.value]);

  const handleToggleEye = () => {
    setInputType(inputType === 'password' ? 'text' : 'password');
  };

  const handleClear = () => {
    setValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (props.onChange) {
      props.onChange({
        ...((window as any).Event ? new Event('input', { bubbles: true }) : {}),
        target: { value: '' },
      } as any);
    }
  };

  return (
    <div className="relative flex items-center">
      <input
        type={inputType}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-10',
          className,
        )}
        ref={(el) => {
          (inputRef as any).current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) (ref as any).current = el;
        }}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          props.onChange?.(e);
        }}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-foreground focus:outline-none"
        onClick={handleClear}
      >
        <XCircle className="w-5 h-5" />
      </button>
      {showEye && type === 'password' && (
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-primary hover:text-foreground focus:outline-none"
          onClick={handleToggleEye}
        >
          {inputType === 'password' ? (
            <Eye className="w-5 h-5" />
          ) : (
            <EyeOff className="w-5 h-5" />
          )}
        </button>
      )}
    </div>
  );
});
Input.displayName = 'Input';

export { Input };
