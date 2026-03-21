'use client';

import { useState, useRef, useEffect, useMemo, type InputHTMLAttributes, type Ref, type KeyboardEvent, type ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TOOLTIP_DELAY } from '@/components/ui/tooltip';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    ref?: Ref<HTMLInputElement>;
    showPasswordLabel?: string;
    hidePasswordLabel?: string;
}

function Input({ className, type, label, value, onChange, disabled, ref, showPasswordLabel = 'Show password', hidePasswordLabel = 'Hide password', ...props }: InputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [autofilled, setAutofilled] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Detect browser autofill via CSS animation trick
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        const onAnim = (e: AnimationEvent) => {
            if (e.animationName === 'onAutoFillStart') setAutofilled(true);
            else if (e.animationName === 'onAutoFillCancel') setAutofilled(false);
        };
        el.addEventListener('animationstart', onAnim);
        // Also check immediately for pre-applied autofill
        try { if (el.matches(':autofill') || el.matches(':-webkit-autofill')) setAutofilled(true); } catch { /* ignore */ }
        const t = setTimeout(() => { try { if (el.matches(':autofill') || el.matches(':-webkit-autofill')) setAutofilled(true); } catch {} }, 200);
        return () => { el.removeEventListener('animationstart', onAnim); clearTimeout(t); };
    }, []);

    const hasValue = value !== undefined && value !== null && String(value).length > 0;
    const isFloating = isFocused || hasValue || autofilled;

    // Reset autofilled flag once the user interacts (types or clears)
    // The browser's onAutoFillCancel animation is unreliable across browsers, so
    // we clear it whenever onChange fires and the field is empty.
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (autofilled) setAutofilled(false);
        onChange?.(e);
    };
    const isPasswordType = type === 'password';
    const currentType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className = {cn("relative", className)}>
            <input
                {...props}
                ref = {(el) => {
                    inputRef.current = el;
                    if (typeof ref === 'function') ref(el);
                    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
                }}
                type = {currentType}
                value = {value}
                
                placeholder = {isFocused ? props.placeholder : undefined}
                onChange = {handleChange}
                disabled = {disabled}
                onFocus = {(e) => {
                    setIsFocused(true);
                    props.onFocus?.(e);
                }}
                onBlur = {(e) => {
                    setIsFocused(false);
                    props.onBlur?.(e);
                }}

                className = {cn(
                    "w-full | h-14 px-4 pt-4",
					"bg-black/5 dark:bg-white/5 | border border-black/10 dark:border-white/10 rounded-xl",
                    "text-neutral-900 dark:text-white text-[15px] text-left",
                    "placeholder:text-muted-foreground/50",
                    "focus:outline-none focus:ring-2 focus:ring-black/15 dark:focus:ring-white/20 focus:border-transparent",
                    "transition-all duration-200",
                    
                    isPasswordType && "pr-12",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            />

            <label
                className = {cn(
                    "absolute left-4 top-4",
                    "text-neutral-500 dark:text-neutral-400",
                    "text-[15px] pointer-events-none",
                    "transition-all duration-200",
                    "transform origin-left",

                    isFloating && "scale-[0.75] -translate-y-3"
                )}
            >
                {label}
            </label>

            {isPasswordType && (
                <TooltipProvider>
                    <Tooltip delayDuration={TOOLTIP_DELAY}>
                        <TooltipTrigger asChild>
                            <button
                                type = "button"
                                onClick = {() => setShowPassword(s => !s)}
                                className = {cn(
                                    "absolute right-3 top-1/2 -translate-y-1/2",
                                    "p-1 | hover:bg-black/5 dark:hover:bg-white/5",
                                    "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
                                    "rounded-lg",
                                    "transition-colors"
                                )}
                                    tabIndex = {-1}
                            >
                                {showPassword ? <EyeOff className = "w-5 h-5" /> : <Eye className = "w-5 h-5" />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                            {showPassword ? hidePasswordLabel : showPasswordLabel}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );
}

// =============================================================================
// OTP INPUT — individual "bubble" boxes for each digit
// =============================================================================

export interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    className?: string;
    ref?: Ref<HTMLDivElement>;
}

function OTPInput({ length = 6, value, onChange, disabled, autoFocus, className, ref }: OTPInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const digits = useMemo(
        () => value.split('').concat(Array(length).fill('')).slice(0, length),
        [value, length]
    );

    const focusInput = (index: number) => {
        if (index >= 0 && index < length) inputRefs.current[index]?.focus();
    };

    const handleChange = (index: number, char: string) => {
        if (!/^\d?$/.test(char)) return;

        const next = [...digits];
        next[index] = char;

        onChange(next.join('').replace(/\s/g, ''));

        if (char && index < length - 1) focusInput(index + 1);
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault();

            if (digits[index]) {
                handleChange(index, '');

            } else if (index > 0) {
                handleChange(index - 1, '');
                focusInput(index - 1);
            }

        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            focusInput(index - 1);

        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            focusInput(index + 1);
        }
    };

    const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        
        if (pasted) {
            onChange(pasted);
            focusInput(Math.min(pasted.length, length - 1));
        }
    };

    return (
        <div ref = {ref} className = {cn("flex items-center justify-center gap-2", className)}>
            {digits.map((digit, i) => (
                <input
                    key = {i}
                    ref = {el => { inputRefs.current[i] = el; }}
                    type = "text"
                    value = {digit || ''}
                    inputMode = "numeric"
                    autoComplete = "one-time-code"
                    maxLength = {1}

                    onChange = {e => handleChange(i, e.target.value.replace(/\D/g, ''))}
                    onKeyDown = {e => handleKeyDown(i, e)}
                    onPaste = {handlePaste}
                    onFocus = {e => e.target.select()}

                    disabled = {disabled}
                    autoFocus = {autoFocus && i === 0}

                    className = {cn(
                        "w-12 h-16",
                        "bg-[#f4f4f5] dark:bg-white/5",
                        "border border-[#e4e4e7] dark:border-white/10",
                        "text-center text-[24px] font-bold rounded-[10px] tracking-[-0.02em]",
                        "text-[#18181b] dark:text-white",
                        "focus:outline-none focus:ring-2 focus:ring-black/15 dark:focus:ring-white/20 focus:border-transparent",
                        "transition-all duration-200",
                        "placeholder:text-neutral-300 dark:placeholder:text-neutral-600",

                        disabled && "opacity-50 cursor-not-allowed"
                    )}

                    placeholder="·"
                />
            ))}
        </div>
    );
}

export { Input, OTPInput };