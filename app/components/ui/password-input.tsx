import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input, type InputProps } from '~/components/ui/input';
import { cn } from '~/lib/utils';

interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /**
   * Whether to show the password by default
   */
  defaultVisible?: boolean;
  /**
   * Auto-hide delay in milliseconds (default: 10000ms = 10 seconds)
   */
  autoHideDelay?: number;
  /**
   * Whether to auto-hide on blur (default: true)
   */
  autoHideOnBlur?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ 
    defaultVisible = false, 
    autoHideDelay = 10000, 
    autoHideOnBlur = true,
    className,
    onBlur,
    ...props 
  }, ref) => {
    const [isVisible, setIsVisible] = React.useState(defaultVisible);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Clear timeout helper
    const clearAutoHideTimeout = React.useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }, []);

    // Set auto-hide timeout
    const setAutoHideTimeout = React.useCallback(() => {
      clearAutoHideTimeout();
      if (isVisible && autoHideDelay > 0) {
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, autoHideDelay);
      }
    }, [isVisible, autoHideDelay, clearAutoHideTimeout]);

    // Toggle visibility
    const toggleVisibility = React.useCallback(() => {
      setIsVisible(prev => {
        const newVisible = !prev;
        // If showing, set auto-hide timeout
        if (newVisible) {
          setTimeout(() => {
            setAutoHideTimeout();
          }, 0);
        } else {
          clearAutoHideTimeout();
        }
        return newVisible;
      });
    }, [setAutoHideTimeout, clearAutoHideTimeout]);

    // Handle blur event
    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      if (autoHideOnBlur && isVisible) {
        setIsVisible(false);
        clearAutoHideTimeout();
      }
      onBlur?.(e);
    }, [autoHideOnBlur, isVisible, onBlur, clearAutoHideTimeout]);

    // Set timeout when visibility changes to true
    React.useEffect(() => {
      if (isVisible) {
        setAutoHideTimeout();
      }
      return clearAutoHideTimeout;
    }, [isVisible, setAutoHideTimeout, clearAutoHideTimeout]);

    // Cleanup on unmount
    React.useEffect(() => {
      return clearAutoHideTimeout;
    }, [clearAutoHideTimeout]);

    // Combine refs
    const combinedRef = React.useCallback((node: HTMLInputElement) => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    return (
      <div className="relative">
        <Input
          {...props}
          ref={combinedRef}
          type={isVisible ? 'text' : 'password'}
          className={cn('pr-10', className)}
          onBlur={handleBlur}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={toggleVisibility}
          tabIndex={-1}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="sr-only">
            {isVisible ? 'Hide password' : 'Show password'}
          </span>
        </Button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';