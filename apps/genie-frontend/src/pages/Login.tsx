import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);

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
      // console.log(e);
      let message = (e.message).replace("Error: ", "");
      console.log(message);
      let obj = JSON.parse(message);
      console.log(obj);
      if (obj?.error?.message) {
        message = obj?.error?.message;
      }
      toast({ title: "Login Failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2">
      {/* Left: Brand/Quote Panel */}
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

      {/* Right: Auth Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md border border-white/10 rounded-xl bg-background/60 backdrop-blur-sm p-6 shadow-lg">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="GenIE" className="h-10 w-10 mb-2" />
            <h1 className="text-2xl font-semibold text-foreground">Welcome to GenIE</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your email to sign in to your account</p>
          </div>

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
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  "Sign In"
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
            Don't have an account? <Link className="text-primary" to="/register">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
