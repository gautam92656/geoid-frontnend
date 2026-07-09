import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "gold-ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    fullWidth?: boolean;
};

const variantClass: Record<ButtonVariant, string> = {
    primary:
        "bg-[#161615] text-[#FAF7F2] hover:opacity-80 border border-[#161615]",
    outline:
        "bg-transparent text-[#2C2417] border border-[#2C24171A] hover:bg-[#F3EDE3]",
    ghost:
        "bg-transparent text-[#5a4f44] underline border-none hover:opacity-70",
    "gold-ghost":
        "bg-transparent text-[#D7B36E] border-none hover:opacity-70 p-0 h-auto font-normal",
};

export function Button({
    variant = "primary",
    fullWidth = false,
    className = "",
    type = "button",
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            className={`btns ${variantClass[variant]} ${fullWidth ? "w-100" : ""} ${className}`}
            {...props}
        />
    );
}
