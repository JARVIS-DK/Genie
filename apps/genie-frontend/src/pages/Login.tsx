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
import { apiRequest, setAuth } from "@/services/api_request";
import { useAppDispatch } from "@/store";
import { setUser } from "@/store/authSlice";

const schema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Enter a valid email"),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const res = await apiRequest({
        url: "/user/login",
        method: "POST",
        payload: values,
      });
      if (!res?.meta?.status) {
        throw new Error(res?.meta?.message || "Login failed");
      }

      // Persist auth tokens and basic user info
      const authPayload = {
        access_token: res?.data?.access_token,
        refresh_token: res?.data?.refresh_token,
        user: {
          id: res?.data?.id ?? res?.data?._id,
          email: res?.data?.email,
          first_name: res?.data?.first_name,
          last_name: res?.data?.last_name,
          phone: res?.data?.phone,
          subscription_type: res?.data?.subscription_type,
        },
      };
      setAuth(authPayload);
      dispatch(setUser(authPayload.user));

      toast({ title: res?.meta?.message || "Logged in" });
      navigate("/");
    } catch (e: any) {
      toast({ title: "Login error", description: e.message, variant: "destructive" });
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
            src="https://images.unsplash.com/photo-1555255707-c07966088b7b?q=80&w=1600&auto=format&fit=crop"
            alt="AI Agents"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome to Genie
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Your enterprise strategy copilot. Chat with AI agents to research, analyze, and execute with speed.
            </p>
          </div>
        </div>

        {/* Right auth card */}
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <Card className="bg-card/70 backdrop-blur-md border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-center">Sign in</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
                <div className="text-sm text-muted-foreground text-center mt-4">
                  Don't have an account? <Link className="text-primary" to="/register">Register</Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
