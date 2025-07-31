import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button, buttonVariants } from "~/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export interface SplitButtonOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface SplitButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  options: SplitButtonOption[];
  children: React.ReactNode;
}

export function SplitButton({
  children,
  className,
  options,
  onClick,
  ...props
}: SplitButtonProps) {
  return (
    <div className={cn("flex", className)}>
      <Button className="rounded-r-none" onClick={onClick} {...props}>
        {children}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="rounded-l-none border-l-0 px-2"
            variant={props.variant}
            size={props.size}
            disabled={props.disabled}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {options.map((option, index) => (
            <DropdownMenuItem key={index} onClick={option.onClick}>
              {option.icon && <span className="mr-2">{option.icon}</span>}
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
