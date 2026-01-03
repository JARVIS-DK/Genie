import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/services/api_request";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2">
      <div className="relative hidden md:block">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_10%_10%,rgba(59,130,246,0.25),transparent_60%),radial-gradient(60%_60%_at_90%_20%,rgba(244,114,182,0.25),transparent_60%),radial-gradient(60%_60%_at_50%_90%,rgba(34,197,94,0.25),transparent_60%)]" />
        <div className="relative h-full flex flex-col justify-between p-10">
          <img src="/logo.png" alt="GenIE" className="h-10 w-10 object-contain" />
          <div className="text-left max-w-xl">
            <div className="text-[11px] tracking-widest text-foreground/70 font-medium mb-3">TRUSTED BY TEAMS</div>
            <blockquote className="text-2xl leading-relaxed text-foreground/90"> 
              “GenIE
The art of orchestrating intelligence.
Autonomous agents working as one.
From complexity to clarity.
From ideas to impact..”
            </blockquote>
            <div className="mt-6 text-sm">
              {/* <div className="font-semibold text-foreground">Shayak Mazumder</div>
              <div className="text-muted-foreground">Founder, GenIE</div> */}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md border border-white/10 rounded-xl bg-background/60 backdrop-blur-sm p-6 shadow-lg">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="GenIE" className="h-10 w-10 mb-2" />
            <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Start your journey with GenIE</p>
          </div>

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
                        <Input id="firstName" placeholder="First name" {...field} />
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
                        <Input id="lastName" placeholder="Last name" {...field} />
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
                        <Input id="phone" inputMode="numeric" placeholder="Phone number" {...field} />
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
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          {...field}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
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
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter your password"
                          {...field}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating account...</span>
                  </span>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>
          <div className="text-xs text-muted-foreground text-center mt-6 space-x-2">
            <span>By continuing, you agree to our</span>
            <a className="underline hover:text-foreground" href="#">Terms of Service</a>
            <span>•</span>
            <a className="underline hover:text-foreground" href="#">Privacy Policy</a>
          </div>

          <div className="text-sm text-muted-foreground text-center mt-4">
            Already have an account? <Link className="text-primary" to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
