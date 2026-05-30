//
//  input.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Defines the reusable Input UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
'use client';

import { useState, useRef, useEffect, useMemo, type InputHTMLAttributes, type Ref, type KeyboardEvent, type ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TOOLTIP_DELAY } from '@/components/ui/tooltip';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    ref?: Ref<HTMLInputElement>;
    showPasswordLabel?: string;
    hidePasswordLabel?: string;
    inputClassName?: string;
}

function Input({ className, inputClassName, type, label, value, onChange, disabled, ref, showPasswordLabel = 'Show password', hidePasswordLabel = 'Hide password', ...props }: InputProps) {
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
        // Also check for pre-applied autofill after the browser has painted.
        const checkAutofill = () => {
            try { if (el.matches(':autofill') || el.matches(':-webkit-autofill')) setAutofilled(true); } catch { /* ignore */ }
        }
        const raf = requestAnimationFrame(checkAutofill);
        const t = setTimeout(checkAutofill, 200);
        return () => { el.removeEventListener('animationstart', onAnim); cancelAnimationFrame(raf); clearTimeout(t); };
    }, []);

    const hasValue = value !== undefined && value !== null && String(value).length > 0;
    const hasFloatingLabel = Boolean(label) && type !== 'search';
    const isFloating = hasFloatingLabel && (isFocused || hasValue || autofilled);
    const resolvedInputClassName = inputClassName ?? className;

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
                placeholder = {hasFloatingLabel ? (isFocused ? props.placeholder : undefined) : props.placeholder}
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
                    "w-full",
                    hasFloatingLabel ? "h-14 px-4 pt-4" : "h-11 px-4",
                    "bg-[var(--surface)] border border-[color:var(--input)] rounded-xl",
                    "backdrop-blur-xl backdrop-saturate-[1.25]",
                    "shadow-[var(--shadow-subtle)]",
                    "text-foreground text-[15px] text-left",
                    "placeholder:text-muted-foreground/70",
                    "hover:border-[color:var(--border-strong)]",
                    "focus:outline-none focus:ring-2 focus:ring-focus/70 focus:ring-offset-2 focus:ring-offset-background focus:border-transparent",
                    "transition-all duration-200",
                    isPasswordType && "pr-12",
                    disabled && "opacity-50 cursor-not-allowed",
                    resolvedInputClassName,
                )}
            />

            {hasFloatingLabel && (
                <label
                    htmlFor = {props.id}
                    className = {cn(
                        "absolute left-4 top-4",
                        "text-neutral-400",
                        "text-[15px] pointer-events-none",
                        "transition-all duration-200",
                        "transform origin-left",
                        isFloating && "scale-[0.75] -translate-y-3"
                    )}
                >
                    {label}
                </label>
            )}

            {isPasswordType && (
                <TooltipProvider>
                    <Tooltip delayDuration={TOOLTIP_DELAY}>
                        <TooltipTrigger asChild>
                            <Button variant="ghost"
                                type = "button"
                                onClick = {() => setShowPassword(s => !s)}
                                aria-label = {showPassword ? hidePasswordLabel : showPasswordLabel}
                                aria-pressed = {showPassword}
                                className = {cn(
                                    "absolute right-2 top-1/2 -translate-y-1/2",
                                    "inline-flex size-9 items-center justify-center",
                                    "hover:bg-accent",
                                    "text-muted-foreground hover:text-foreground",
                                    "rounded-lg",
                                    "transition-colors",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                                )}
                            >
                                {showPassword ? <Eye className = "w-5 h-5" /> : <EyeOff className = "w-5 h-5" />}
                            </Button>
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
    ariaLabel?: string;
    className?: string;
    ref?: Ref<HTMLDivElement>;
}

function OTPInput({ length = 6, value, onChange, disabled, autoFocus, ariaLabel = "Verification code", className, ref }: OTPInputProps) {
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
        <div ref = {ref} role = "group" aria-label = {ariaLabel} className = {cn("flex items-center justify-center gap-2", className)}>
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
                    aria-label = {`${ariaLabel} digit ${i + 1}`}

                    className = {cn(
                        "w-12 h-16",
                        "bg-[var(--surface)]",
                        "border border-[color:var(--input)]",
                        "text-center text-[24px] font-bold rounded-[10px]",
                        "text-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-focus/70 focus:ring-offset-2 focus:ring-offset-background focus:border-transparent",
                        "transition-all duration-200",
                        "placeholder:text-muted-foreground",

                        disabled && "opacity-50 cursor-not-allowed"
                    )}

                    placeholder="·"
                />
            ))}
        </div>
    );
}

export { Input, OTPInput };
