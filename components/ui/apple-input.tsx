'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { SURFACE, FOCUS_RING } from '@/lib/styles';
import { Eye, EyeOff } from 'lucide-react';

export interface AppleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const AppleInput = React.forwardRef<HTMLInputElement, AppleInputProps>(
    ({ className, type, label, value, onChange, disabled, ...props }, ref) => {
        const [isFocused, setIsFocused] = React.useState(false);
        const [showPassword, setShowPassword] = React.useState(false);

        const hasValue = value !== undefined && value !== null && value.toString().length > 0;
        const isFloating = isFocused || hasValue;
        const isPasswordType = type === 'password';
        const currentType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

        return (
            <div className={cn("relative", className)}>
                <input
                    {...props}
                    ref={ref}
                    type={currentType}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    className={cn(
                        `w-full h-14 px-4 pt-4 pb-1`,
                        SURFACE,
                        FOCUS_RING,
                        `text-[15px] text-neutral-900 dark:text-white
                        transition-all duration-200
                        peer`,
                        isPasswordType && "pr-12",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    placeholder=" " // Required for CSS peer-placeholder-shown to work
                />
                <label
                    className={cn(
                        `absolute left-4 top-4
                        text-neutral-500 dark:text-neutral-400
                        text-[15px]
                        pointer-events-none
                        transition-all duration-200
                        transform origin-left
                        ${isFloating
                            ? 'scale-[0.75] -translate-y-3'
                            : ''
                        }
                        peer-placeholder-shown:scale-100
                        peer-placeholder-shown:translate-y-0
                        peer-focus:scale-[0.75]
                        peer-focus:-translate-y-3`
                    )}
                >
                    {label}
                </label>

                {isPasswordType && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                )}
            </div>
        );
    }
);
AppleInput.displayName = 'AppleInput';

export { AppleInput };
