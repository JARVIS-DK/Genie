import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/services/api_request";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
    countryCode: z.string().min(1, "Country code is required"),
    phone: z
      .string()
      .min(6, "Enter a valid phone number")
      .max(15, "Enter a valid phone number")
      .regex(/^\d+$/, "Digits only"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

const Register = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "", countryCode: "IN", phone: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const payload = {
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        password: values.password,
        // phone_country_code: values.countryCode,
        phone: values.phone,
      };

      const res = await apiRequest({
        url: "/user/register",
        method: "POST",
        payload,
      });
      if (!res?.meta?.status) {
        throw new Error(res?.meta?.message || "Registration failed");
      }
      toast({ title: res?.meta?.message || "Account created" });
      navigate("/login");
    } catch (e: any) {
      toast({ title: "Registration error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left hero with AI agents imagery */}
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/20" />
          <img
            src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop"
            alt="AI Agents"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Join Genie and unlock AI agents tailored for enterprise research and strategy.
            </p>
          </div>
        </div>

        {/* Right auth card */}
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <Card className="bg-card/70 backdrop-blur-md border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-center">Register</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <Label htmlFor="firstName">First Name</Label>
                            <FormControl>
                              <Input id="firstName" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <Label htmlFor="lastName">Last Name</Label>
                            <FormControl>
                              <Input id="lastName" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="email">Email</Label>
                          <FormControl>
                            <Input id="email" type="email" placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-[140px_1fr] gap-3">
                      <FormField
                        control={form.control}
                        name="countryCode"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Country</Label>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                  <SelectItem value="US">United States (+1)</SelectItem>
                                  <SelectItem value="IN">India (+91)</SelectItem>
                                  <SelectItem value="GB">United Kingdom (+44)</SelectItem>
                                  <SelectItem value="AE">United Arab Emirates (+971)</SelectItem>
                                  <SelectItem value="AU">Australia (+61)</SelectItem>
                                  <SelectItem value="CA">Canada (+1)</SelectItem>
                                  <SelectItem value="DE">Germany (+49)</SelectItem>
                                  <SelectItem value="FR">France (+33)</SelectItem>
                                  <SelectItem value="SG">Singapore (+65)</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <Label htmlFor="phone">Phone Number</Label>
                            <FormControl>
                              <Input id="phone" inputMode="numeric" placeholder="1234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="password">Password</Label>
                          <FormControl>
                            <Input id="password" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="confirmPassword">Confirm Password</Label>
                          <FormControl>
                            <Input id="confirmPassword" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
                <div className="text-sm text-muted-foreground text-center mt-4">
                  Already have an account? <Link className="text-primary" to="/login">Login</Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
