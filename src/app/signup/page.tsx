// src/app/signup/page.tsx
"use client";

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  mobileNumber: z.string().min(10, { message: "Mobile number must be at least 10 digits." })
    .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid mobile number format (e.g., +1234567890).' }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"], // path of error
});

type FormData = z.infer<typeof formSchema>;

export default function SignupPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<z.ZodFormattedError<FormData> | null>(null);
  const { signup, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors) { // Clear errors on change
        setErrors(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors(null); // Clear previous errors
    const validationResult = formSchema.safeParse(formData);

    if (!validationResult.success) {
      setErrors(validationResult.error.format());
      toast({ title: "Validation Error", description: "Please check the form for errors.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    const success = await signup(
      validationResult.data.name,
      validationResult.data.email,
      validationResult.data.password,
      validationResult.data.mobileNumber
    );
    if (success) {
      // Navigation is handled by AuthContext
    }
    setIsSubmitting(false);
  };
  
  const effectiveIsLoading = authLoading || isSubmitting;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/30 to-background p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Create an Account</CardTitle>
          <CardDescription>Join WeatherEyes to save your weather searches.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" disabled={effectiveIsLoading} />
              {errors?.name && <p className="text-sm text-destructive mt-1">{errors.name._errors.join(', ')}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" disabled={effectiveIsLoading} />
              {errors?.email && <p className="text-sm text-destructive mt-1">{errors.email._errors.join(', ')}</p>}
            </div>
            <div>
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input id="mobileNumber" name="mobileNumber" type="tel" value={formData.mobileNumber} onChange={handleChange} placeholder="+1234567890" disabled={effectiveIsLoading} />
              {errors?.mobileNumber && <p className="text-sm text-destructive mt-1">{errors.mobileNumber._errors.join(', ')}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" disabled={effectiveIsLoading} />
              {errors?.password && <p className="text-sm text-destructive mt-1">{errors.password._errors.join(', ')}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" disabled={effectiveIsLoading} />
              {errors?.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword._errors.join(', ')}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={effectiveIsLoading}>
              {effectiveIsLoading ? <Loader2 className="animate-spin" /> : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/login">Log in</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
