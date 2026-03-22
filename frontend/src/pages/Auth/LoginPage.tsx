import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff, Smartphone, Shield, Sparkles, Zap, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../state/authStore';
import { Button } from '../../ui/Button';
import { useTheme } from '../../state/themeStore';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@voicecrm.app');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Successfully logged in!');
      } else {
        toast.error('Invalid email or password.');
      }
    } catch (error) {
      toast.error('Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex bg-[#050910] text-white overflow-hidden relative">
      
      {/* LEFT SIDE: Visuals & Branding */}
      <div className="hidden lg:flex w-[52%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden border-r border-white/5 h-full">
        {/* Background Visuals */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#050910] via-[#050910] to-[#0a1a2f]" />
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[140px] rounded-full animate-pulse" />
          
          {/* Subtle Video Overlay */}
          <video 
            src="/call-center.mp4" 
            autoPlay 
            loop 
            muted 
            className="absolute inset-0 w-full h-full object-cover opacity-[0.07] mix-blend-overlay"
          />
        </div>

        {/* Logo & Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center p-2 shadow-2xl shadow-primary/20">
             <img src="/VMS-Logo-light.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter text-white leading-none">VoiceCRM</span>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/80 mt-1">Intelligence Systems</span>
          </div>
        </motion.div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-xl mt-6">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-5xl xl:text-6xl font-black text-white tracking-tighter leading-[0.95] mb-6">
              Transform every <span className="text-primary">voice</span> into <span className="text-[#38bdf8]">value.</span>
            </h1>
            <p className="text-lg text-muted-foreground/70 font-medium leading-relaxed max-w-lg">
              The industry's leading AI-powered voice intelligence platform. Automate workflows, score leads, and unlock insights.
            </p>
          </motion.div>

          {/* Feature Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-x-8 gap-y-6 mt-10"
          >
            {[
              { icon: Zap, title: "Real-time Processing", desc: "Instant AI analysis of every call." },
              { icon: Shield, title: "Enterprise Security", desc: "Military-grade data protection." },
              { icon: MessageSquare, title: "Smart Transcription", desc: "99% accuracy in 50+ languages." },
              { icon: Sparkles, title: "Predictive Scoring", desc: "AI-driven lead qualification." }
            ].map((f, i) => (
              <div key={i} className="flex flex-col gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary/10 group-hover:border-primary/30 transition-all duration-300">
                  <f.icon size={18} />
                </div>
                <div>
                  <h3 className="font-black text-[13px] text-white tracking-tight">{f.title}</h3>
                  <p className="text-[10px] text-muted-foreground/50 font-bold leading-normal">{f.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 flex items-center gap-8"
        >
          <div className="flex -space-x-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-9 h-9 rounded-full border-2 border-[#050910] overflow-hidden bg-secondary shadow-lg">
                <img src={`https://i.pravatar.cc/150?u=${i+20}`} alt="user" />
              </div>
            ))}
          </div>
          <p className="text-[13px] font-bold text-muted-foreground/40">
            Trusted by <span className="text-white font-black">5,000+</span> growth teams.
          </p>
        </motion.div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-[48%] flex flex-col items-center justify-center p-8 sm:p-12 xl:p-16 relative bg-[#050910] h-full overflow-y-auto no-scrollbar">
        {/* Glow for right side */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Mobile Only Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center p-2 shadow-sm">
              <img src="/VMS-Logo-light.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-black tracking-tighter text-white">VoiceCRM</span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tighter mb-3">Welcome Back</h2>
            <p className="text-muted-foreground font-semibold text-[15px]">Enter your credentials to access the workspace.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 px-1">
                Workspace Email
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0d121f]/50 border border-white/[0.05] group-focus-within:border-primary/40 group-focus-within:bg-[#0d121f] rounded-2xl py-4 pl-14 pr-5 text-[15px] font-bold text-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/20"
                  placeholder="admin@voicecrm.app"
                  required
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
                  Secure Password
                </label>
                <button type="button" className="text-[10px] font-black uppercase tracking-widest text-[#38bdf8] hover:underline">
                  Reset?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0d121f]/50 border border-white/[0.05] group-focus-within:border-primary/40 group-focus-within:bg-[#0d121f] rounded-2xl py-4 pl-14 pr-14 text-[15px] font-bold text-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/20"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <input 
                type="checkbox" 
                id="remember" 
                className="w-4.5 h-4.5 rounded-md border-white/10 bg-[#0d121f] text-primary focus:ring-offset-0 focus:ring-primary transition-all cursor-pointer accent-primary" 
                defaultChecked 
              />
              <label htmlFor="remember" className="text-[13px] font-bold text-muted-foreground/60 cursor-pointer select-none">
                Keep me signed in
              </label>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full h-[62px] rounded-[22px] text-base font-black shadow-2xl shadow-primary/30 bg-[#38bdf8] text-[#050910] hover:translate-y-[-2px] hover:shadow-primary/40 transition-all active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#050910]/30 border-t-[#050910] rounded-full animate-spin" />
                  <span>Authorizing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Sign In to Workspace</span>
                  <LogIn size={20} className="stroke-[3px]" />
                </div>
              )}
            </Button>
          </form>

          <div className="mt-10 relative flex items-center justify-center">
            <div className="absolute w-full border-t border-white/[0.05]"></div>
            <span className="relative bg-[#050910] px-6 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/20">
              Identity Verification
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button className="flex items-center justify-center gap-3 h-14 rounded-2xl bg-[#0d121f] border border-white/[0.05] hover:bg-[#161d2f] hover:border-white/10 transition-all font-black text-[10px] uppercase tracking-widest group">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
              <span>Google</span>
            </button>
            <button className="flex items-center justify-center gap-3 h-14 rounded-2xl bg-[#0d121f] border border-white/[0.05] hover:bg-[#161d2f] hover:border-white/10 transition-all font-black text-[10px] uppercase tracking-widest group">
              <Smartphone size={18} className="text-[#38bdf8] group-hover:scale-110 transition-transform" />
              <span>Mobile</span>
            </button>
          </div>

          <p className="mt-8 text-center text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.1em]">
            Protected by enterprise encryption standards.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
