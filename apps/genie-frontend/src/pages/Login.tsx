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
  email: z.string().email(),
  password: z.string().min(6),
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
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="text-center">Login</CardTitle>
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
  );
};

export default Login;