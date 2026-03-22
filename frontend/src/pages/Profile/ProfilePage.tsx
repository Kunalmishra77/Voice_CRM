import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Briefcase, Building2, Globe2, Languages,
  Camera, Save, RotateCcw, Shield, Clock, Activity,
  Edit3, CheckCircle2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

import { PageShell } from '../../ui/PageShell';
import { SectionCard } from '../../ui/SectionCard';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { useProfile, type UserProfile } from '../../state/profileStore';
import { cn } from '../../lib/utils';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
];

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Hindi', 'Japanese', 'Chinese'];
const DEPARTMENTS = ['Sales', 'Marketing', 'Support', 'Engineering', 'Management', 'Operations'];
const ROLES = ['Admin', 'Manager', 'Agent', 'Supervisor', 'Analyst', 'Viewer'];

const AVATAR_COLORS = [
  'var(--brand-700)', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9',
];

interface FieldRowProps {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  iconColor?: string;
}

const FieldRow: React.FC<FieldRowProps> = ({ icon: Icon, label, children, iconColor }) => (
  <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/40 border border-border/50 hover:border-primary/30 transition-all group">
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-border/50 shadow-sm transition-transform group-hover:scale-105"
      style={iconColor ? { background: iconColor + '15', color: iconColor } : { background: 'var(--brand-50)', color: 'var(--brand-500)' }}
    >
      <Icon size={20} />
    </div>
    <div className="flex-1 min-w-0">
      <label className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest block mb-0.5">{label}</label>
      <div className="text-sm font-bold text-foreground tracking-tight">
        {children}
      </div>
    </div>
  </div>
);

const ProfilePage: React.FC = () => {
  const { profile, updateProfile, resetProfile } = useProfile();
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [isDirty, setIsDirty] = useState(false);
  const [avatarColor, setAvatarColor] = useState(profile.avatar.includes('#') ? profile.avatar : AVATAR_COLORS[0]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setDraft(profile);
    const savedColor = localStorage.getItem('voicecrm-avatar-color');
    if (savedColor) setAvatarColor(savedColor);
  }, [profile]);

  useEffect(() => {
    const changed = Object.keys(draft).some(
      (key) => draft[key as keyof UserProfile] !== profile[key as keyof UserProfile]
    );
    setIsDirty(changed);
  }, [draft, profile]);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!draft.email.trim() || !draft.email.includes('@')) {
      toast.error('Valid email is required.');
      return;
    }
    updateProfile(draft);
    localStorage.setItem('voicecrm-avatar-color', avatarColor);
    setIsEditing(false);
    toast.success('Profile saved successfully.');
  };

  const handleReset = () => {
    resetProfile();
    setAvatarColor(AVATAR_COLORS[0]);
    localStorage.setItem('voicecrm-avatar-color', AVATAR_COLORS[0]);
    setDraft({ ...profile, name: 'Admin', email: 'admin@voicecrm.app', phone: '+1 (555) 000-0000', role: 'Manager', department: 'Sales', timezone: 'America/New_York', avatar: 'A', language: 'English', bio: '' });
    setIsEditing(false);
    toast.success('Profile reset to defaults.');
  };

  const handleCancel = () => {
    setDraft(profile);
    const savedColor = localStorage.getItem('voicecrm-avatar-color');
    if (savedColor) setAvatarColor(savedColor);
    setIsEditing(false);
  };

  const initials = draft.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tighter leading-none">My Profile</h1>
          <p className="text-muted-foreground font-medium mt-2 text-lg">Manage your personal information and preferences.</p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} className="rounded-2xl px-6 h-11 text-xs font-bold border-border/60">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty}
                className="rounded-2xl px-8 h-11 text-xs font-bold shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:scale-105 transition-all"
              >
                <Save size={16} className="mr-2" /> Save Changes
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="rounded-2xl px-8 h-11 text-xs font-bold shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:scale-105 transition-all"
            >
              <Edit3 size={16} className="mr-2" /> Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-10">
        {/* Left column — Avatar + Info Card */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <SectionCard className="items-center text-center p-10 bg-card/30 backdrop-blur-md border-border/40 relative overflow-hidden group">
            {/* Background Decorative Gradient */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            
            {/* Avatar Section */}
            <div className="relative mb-8 flex justify-center">
              <div 
                className="absolute inset-0 blur-3xl opacity-20 scale-150 transition-all duration-700 group-hover:opacity-30 group-hover:scale-[1.7] rounded-full"
                style={{ background: avatarColor }}
              />
              <div
                className="w-36 h-36 rounded-full flex items-center justify-center text-white text-6xl font-black shadow-2xl relative z-10 transition-all duration-500 group-hover:scale-105 group-hover:rotate-3 ring-4 ring-white/5"
                style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)` }}
              >
                {initials}
              </div>
              {isEditing && (
                <div className="absolute bottom-1 right-1/2 translate-x-[60px] w-11 h-11 rounded-full bg-primary text-white shadow-xl flex items-center justify-center z-20 animate-in zoom-in duration-300 border-4 border-[#050910]">
                  <Camera size={20} />
                </div>
              )}
            </div>

            <div className="space-y-2 mb-8 relative z-10">
              <h2 className="text-3xl font-black text-foreground tracking-tighter">{draft.name || 'Unnamed'}</h2>
              <p className="text-[15px] text-muted-foreground/60 font-bold tracking-tight">{draft.email}</p>
            </div>
            
            <div className="relative z-10 px-8 py-2.5 rounded-2xl bg-primary/5 border border-primary/20 inline-flex items-center gap-2 mb-10 shadow-inner group/role">
               <Shield size={14} className="text-primary group-hover/role:scale-110 transition-transform" />
               <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">{draft.role}</span>
            </div>

            {/* Avatar color picker (edit mode) */}
            {isEditing && (
              <div className="mt-4 mb-8 w-full animate-in fade-in slide-in-from-top-4 duration-500 relative z-10">
                <p className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest mb-5">Customize Avatar Color</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAvatarColor(color)}
                      className={cn(
                        "w-9 h-9 rounded-2xl transition-all border-4",
                        avatarColor === color ? "scale-125 border-primary shadow-lg z-20" : "border-transparent hover:scale-110 opacity-60 hover:opacity-100 hover:rotate-12"
                      )}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick stats with modern glass effect */}
            <div className="w-full grid grid-cols-2 gap-5 relative z-10">
              <div className="p-5 rounded-3xl bg-[#0d121f]/40 border border-white/[0.03] text-center hover:bg-[#0d121f]/60 hover:border-primary/20 transition-all group/stat">
                <p className="text-lg font-black text-foreground tracking-tight group-hover/stat:scale-105 transition-transform">{draft.department}</p>
                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mt-1.5">Department</p>
              </div>
              <div className="p-5 rounded-3xl bg-[#0d121f]/40 border border-white/[0.03] text-center hover:bg-[#0d121f]/60 hover:border-primary/20 transition-all group/stat">
                <p className="text-lg font-black text-foreground tracking-tight group-hover/stat:scale-105 transition-transform">{draft.language}</p>
                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mt-1.5">Language</p>
              </div>
            </div>
          </SectionCard>

          {/* Account Status */}
          <SectionCard title="Account Status" subtitle="Your account health." icon={<Shield size={18} className="text-emerald-500" />}>
            <div className="space-y-3 py-1">
              {[
                { label: 'Account Status', value: 'Active', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Role', value: draft.role, icon: Shield, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Last Login', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Session', value: 'Current', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-secondary/60 border border-transparent hover:border-border/50 transition-all group">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110", item.bg, item.color)}>
                    <item.icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{item.label}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5 tracking-tight">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right column — Editable Fields */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <SectionCard title="Personal Information" subtitle="Your basic details." icon={<User size={18} className="text-primary" />}>
            <div className="space-y-5 py-1">
              <FieldRow icon={User} label="Full Name">
                {isEditing ? (
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full bg-card/50 border border-border/60 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    placeholder="Your full name"
                  />
                ) : (
                  <span>{draft.name}</span>
                )}
              </FieldRow>

              <FieldRow icon={Mail} label="Email Address" iconColor="#3b82f6">
                {isEditing ? (
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full bg-card/50 border border-border/60 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    placeholder="your@email.com"
                  />
                ) : (
                  <span>{draft.email}</span>
                )}
              </FieldRow>

              <FieldRow icon={Phone} label="Phone Number" iconColor="#22c55e">
                {isEditing ? (
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full bg-card/50 border border-border/60 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    placeholder="+1 (555) 000-0000"
                  />
                ) : (
                  <span>{draft.phone}</span>
                )}
              </FieldRow>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FieldRow icon={Briefcase} label="Role" iconColor="#8b5cf6">
                  {isEditing ? (
                    <select
                      value={draft.role}
                      onChange={(e) => handleChange('role', e.target.value)}
                      className="w-full bg-card/50 border border-border/60 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span>{draft.role}</span>
                  )}
                </FieldRow>

                <FieldRow icon={Building2} label="Department" iconColor="#f97316">
                  {isEditing ? (
                    <select
                      value={draft.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                      className="w-full bg-card/50 border border-border/60 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    >
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : (
                    <span>{draft.department}</span>
                  )}
                </FieldRow>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Preferences" subtitle="Regional and display settings." icon={<Globe2 size={18} className="text-blue-500" />}>
            <div className="space-y-5 py-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FieldRow icon={Clock} label="Timezone" iconColor="#0ea5e9">
                  {isEditing ? (
                    <select
                      value={draft.timezone}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                      className="w-full bg-card/50 border border-border/60 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    >
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                    </select>
                  ) : (
                    <span>{draft.timezone.replace(/_/g, ' ')}</span>
                  )}
                </FieldRow>

                <FieldRow icon={Languages} label="Language" iconColor="#a855f7">
                  {isEditing ? (
                    <select
                      value={draft.language}
                      onChange={(e) => handleChange('language', e.target.value)}
                      className="w-full bg-card/50 border border-border/60 rounded-xl py-2 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    >
                      {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  ) : (
                    <span>{draft.language}</span>
                  )}
                </FieldRow>
              </div>

              <FieldRow icon={Edit3} label="Bio" iconColor="#14b8a6">
                {isEditing ? (
                  <textarea
                    value={draft.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    rows={3}
                    className="w-full bg-card/50 border border-border/60 rounded-xl py-2.5 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none"
                    placeholder="Write a short bio..."
                  />
                ) : (
                  <span className={!draft.bio ? "text-muted-foreground/50 italic font-medium" : ""}>{draft.bio || 'No bio set'}</span>
                )}
              </FieldRow>
            </div>
          </SectionCard>

          {/* Danger zone */}
          <SectionCard title="Danger Zone" subtitle="Irreversible actions." icon={<AlertCircle size={18} className="text-rose-500" />}>
            <div className="flex items-center justify-between p-6 rounded-[2rem] border border-rose-500/20 bg-rose-500/5 group hover:bg-rose-500/10 transition-all">
              <div>
                <p className="text-base font-black text-foreground tracking-tight">Reset Profile</p>
                <p className="text-xs text-muted-foreground font-bold mt-1">Revert all profile data to default values.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { if (confirm('Reset all profile data to defaults?')) handleReset(); }}
                className="rounded-2xl px-6 h-11 text-xs font-black border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
              >
                <RotateCcw size={16} className="mr-2" /> Reset
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
};

export default ProfilePage;
