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

import { useState, useRef, useEffect, type InputHTMLAttributes, type Ref } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TOOLTIP_DELAY } from '@/components/ui/tooltip';
import { UDS } from '@/lib/UDS';

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
                data-slot="input"
                ref = {(el) => {
                    inputRef.current = el;
                    if (typeof ref === 'function') ref(el);
                    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
                }}
                type = {currentType}
                value = {value}
                placeholder = {hasFloatingLabel ? (isFloating ? props.placeholder : undefined) : props.placeholder}
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
                    hasFloatingLabel ? "h-14 px-4 pb-2 pt-6" : "h-11 px-4",
                    UDS.inputSurface,
                    "text-left text-base text-foreground caret-blue-600 dark:caret-blue-300",
                    "placeholder:text-muted-foreground/60",
                    UDS.inputHover,
                    UDS.inputFocus,
                    "transition-[background-color,border-color,color,box-shadow,opacity] duration-200",
                    "aria-invalid:border-destructive/60 aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:border-destructive/70 aria-invalid:focus-visible:ring-destructive/25 dark:aria-invalid:ring-destructive/30",
                    isPasswordType && "pr-12",
                    disabled && cn(UDS.disabledSurface, "cursor-not-allowed border-border/60 opacity-70"),
                    resolvedInputClassName,
                )}
            />

            {hasFloatingLabel && (
                <label
                    htmlFor = {props.id}
                    className = {cn(
                        "absolute left-4 top-1/2",
                        "pointer-events-none text-base leading-none",
                        "transition-[color,translate,scale] duration-200 ease-out will-change-transform",
                        "transform origin-top-left",
                        isFocused ? "text-blue-600/80 dark:text-blue-300/80" : "text-muted-foreground/80",
                        isFloating ? "-translate-y-[20px] scale-[0.75]" : "-translate-y-1/2 scale-100"
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
                                    UDS.itemHover,
                                    "text-muted-foreground hover:text-foreground",
                                    "sq-lg",
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

export { Input };
