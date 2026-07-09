"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
import { ApiError } from "@/shared/services/apiClient";
import { registerUser } from "../services/authApi";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormErrors = {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    form?: string;
};

export function RegisterForm() {
    const router = useRouter();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);

    function validate(): FormErrors {
        const next: FormErrors = {};

        if (!firstName.trim()) {
            next.firstName = "First name is required.";
        }
        if (!lastName.trim()) {
            next.lastName = "Last name is required.";
        }
        if (!email.trim()) {
            next.email = "Email address is required.";
        } else if (!EMAIL_PATTERN.test(email.trim())) {
            next.email = "Please enter a valid email address.";
        }
        if (!password) {
            next.password = "Password is required.";
        } else if (!PASSWORD_PATTERN.test(password)) {
            next.password = "Must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.";
        }
        if (!confirmPassword) {
            next.confirmPassword = "Please confirm your password.";
        } else if (password !== confirmPassword) {
            next.confirmPassword = "Passwords do not match.";
        }
        if (!agreed) {
            next.terms = "Please agree to the Terms of Service and Privacy Policy.";
        }

        return next;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        setSubmitting(true);
        try {
            const result = await registerUser({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password,
                confirmPassword,
                role: "COMMUNITY_USER",
                termsAndConditions: agreed,
            });
            router.push(`/verify-account?email=${encodeURIComponent(result.email)}`);
        } catch (err) {
            setErrors({
                form: err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-row-2col">
                <div className="form-group">
                    <Label htmlFor="reg-first-name">First Name<span className="required-star">*</span></Label>
                    <Input
                        id="reg-first-name"
                        name="firstName"
                        autoComplete="given-name"
                        placeholder="First name"
                        value={firstName}
                        onChange={(ev) => setFirstName(ev.target.value)}
                    />
                    {errors.firstName ? (
                        <p className="field-error">{errors.firstName}</p>
                    ) : null}
                </div>
                <div className="form-group">
                    <Label htmlFor="reg-last-name">Last Name<span className="required-star">*</span></Label>
                    <Input
                        id="reg-last-name"
                        name="lastName"
                        autoComplete="family-name"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(ev) => setLastName(ev.target.value)}
                    />
                    {errors.lastName ? (
                        <p className="field-error">{errors.lastName}</p>
                    ) : null}
                </div>
            </div>

            <div className="form-group">
                <Label htmlFor="reg-email">Email Address<span className="required-star">*</span></Label>
                <Input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                />
                {errors.email ? (
                    <p className="field-error">{errors.email}</p>
                ) : null}
            </div>

            <div className="form-group">
                <Label htmlFor="reg-password">Password<span className="required-star">*</span></Label>
                <Input
                    id="reg-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                />
                {errors.password ? (
                    <p className="field-error">{errors.password}</p>
                ) : null}
            </div>

            <div className="form-group">
                <Label htmlFor="reg-confirm-password">Confirm Password<span className="required-star">*</span></Label>
                <Input
                    id="reg-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(ev) => setConfirmPassword(ev.target.value)}
                />
                {errors.confirmPassword ? (
                    <p className="field-error">{errors.confirmPassword}</p>
                ) : null}
            </div>

            <div className="form-terms">
                <input
                    id="reg-terms"
                    type="checkbox"
                    checked={agreed}
                    onChange={(ev) => setAgreed(ev.target.checked)}
                />
                <label htmlFor="reg-terms">
                    I agree to the Terms of Service and Privacy Policy
                </label>
            </div>
            {errors.terms ? (
                <p className="field-error">{errors.terms}</p>
            ) : null}

            {errors.form ? (
                <p className="field-error">{errors.form}</p>
            ) : null}

            <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? "Creating Account..." : "Create Account"}
            </Button>

            <p className="text-center auth-bottom-link">
                Already have one?{" "}
                <Link href="/login">Sign in</Link>
            </p>
        </form>
    );
}
