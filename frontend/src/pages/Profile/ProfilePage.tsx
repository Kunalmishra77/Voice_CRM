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
  <div className="flex items-start gap-4 p-4 rounded-2xl bg-secondary border border-border">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border"
      style={iconColor ? { background: iconColor + '15', color: iconColor } : { background: 'var(--brand-50)', color: 'var(--brand-500)' }}
    >
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block mb-1.5">{label}</label>
      {children}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-none">My Profile</h1>
          <p className="text-muted-foreground font-medium mt-1">Manage your personal information and preferences.</p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} className="rounded-2xl px-5 h-10 text-xs font-semibold">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty}
                className="rounded-2xl px-6 h-10 text-xs font-semibold shadow-sm bg-primary text-primary-foreground hover:scale-105 transition-transform"
              >
                <Save size={14} className="mr-2" /> Save Changes
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="rounded-2xl px-6 h-10 text-xs font-semibold shadow-sm bg-primary text-primary-foreground hover:scale-105 transition-transform"
            >
              <Edit3 size={14} className="mr-2" /> Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-10">
        {/* Left column — Avatar + Info Card */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <SectionCard className="items-center text-center">
            {/* Avatar */}
            <div className="relative group mb-4">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg transition-transform group-hover:scale-105"
                style={{ background: avatarColor }}
              >
                {initials}
              </div>
              {isEditing && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground">
                  <Camera size={14} />
                </div>
              )}
            </div>

            <h2 className="text-lg font-bold text-foreground tracking-tight">{draft.name || 'Unnamed'}</h2>
            <p className="text-xs text-muted-foreground font-medium">{draft.email}</p>
            <Badge variant="teal" className="mt-2 text-[10px] font-semibold px-3 py-1 rounded-full uppercase">{draft.role}</Badge>

            {/* Avatar color picker (edit mode) */}
            {isEditing && (
              <div className="mt-6 w-full">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-3">Avatar Color</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAvatarColor(color)}
                      className={cn(
                        "w-8 h-8 rounded-xl transition-all border-2",
                        avatarColor === color ? "scale-110 border-foreground shadow-sm" : "border-transparent hover:scale-105"
                      )}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="mt-6 w-full grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-secondary border border-border text-center">
                <p className="text-lg font-bold text-foreground">{draft.department}</p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Department</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary border border-border text-center">
                <p className="text-lg font-bold text-foreground">{draft.language}</p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Language</p>
              </div>
            </div>
          </SectionCard>

          {/* Account Status */}
          <SectionCard title="Account Status" subtitle="Your account health." icon={<Shield size={18} className="text-emerald-500" />}>
            <div className="space-y-4 py-1">
              {[
                { label: 'Account Status', value: 'Active', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Role', value: draft.role, icon: Shield, color: '', bg: '' },
                { label: 'Last Login', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Session', value: 'Current', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-all">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", item.bg, item.color)} style={!item.color ? { background: 'var(--brand-50)', color: 'var(--brand-500)' } : {}}>
                    <item.icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    <p className="text-xs font-bold text-foreground mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right column — Editable Fields */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <SectionCard title="Personal Information" subtitle="Your basic details." icon={<User size={18} style={{ color: 'var(--brand-500)' }} />}>
            <div className="space-y-4 py-1">
              <FieldRow icon={User} label="Full Name">
                {isEditing ? (
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full bg-card border border-border rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    placeholder="Your full name"
                  />
                ) : (
                  <p className="text-sm font-semibold text-foreground">{draft.name}</p>
                )}
              </FieldRow>

              <FieldRow icon={Mail} label="Email Address" iconColor="#3b82f6">
                {isEditing ? (
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full bg-card border border-border rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    placeholder="your@email.com"
                  />
                ) : (
                  <p className="text-sm font-semibold text-foreground">{draft.email}</p>
                )}
              </FieldRow>

              <FieldRow icon={Phone} label="Phone Number" iconColor="#22c55e">
                {isEditing ? (
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full bg-card border border-border rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    placeholder="+1 (555) 000-0000"
                  />
                ) : (
                  <p className="text-sm font-semibold text-foreground">{draft.phone}</p>
                )}
              </FieldRow>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow icon={Briefcase} label="Role" iconColor="#8b5cf6">
                  {isEditing ? (
                    <select
                      value={draft.role}
                      onChange={(e) => handleChange('role', e.target.value)}
                      className="w-full bg-card border border-border rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">{draft.role}</p>
                  )}
                </FieldRow>

                <FieldRow icon={Building2} label="Department" iconColor="#f97316">
                  {isEditing ? (
                    <select
                      value={draft.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                      className="w-full bg-card border border-border rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    >
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">{draft.department}</p>
                  )}
                </FieldRow>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Preferences" subtitle="Regional and display settings." icon={<Globe2 size={18} className="text-blue-500" />}>
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow icon={Clock} label="Timezone" iconColor="#0ea5e9">
                  {isEditing ? (
                    <select
                      value={draft.timezone}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                      className="w-full bg-card border border-border rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    >
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">{draft.timezone.replace(/_/g, ' ')}</p>
                  )}
                </FieldRow>

                <FieldRow icon={Languages} label="Language" iconColor="#a855f7">
                  {isEditing ? (
                    <select
                      value={draft.language}
                      onChange={(e) => handleChange('language', e.target.value)}
                      className="w-full bg-card border border-border rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    >
                      {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">{draft.language}</p>
                  )}
                </FieldRow>
              </div>

              <FieldRow icon={Edit3} label="Bio" iconColor="#14b8a6">
                {isEditing ? (
                  <textarea
                    value={draft.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    rows={3}
                    className="w-full bg-card border border-border rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none"
                    placeholder="Write a short bio..."
                  />
                ) : (
                  <p className="text-sm text-foreground">{draft.bio || <span className="text-muted-foreground italic">No bio set</span>}</p>
                )}
              </FieldRow>
            </div>
          </SectionCard>

          {/* Danger zone */}
          <SectionCard title="Danger Zone" subtitle="Irreversible actions." icon={<AlertCircle size={18} className="text-rose-500" />}>
            <div className="flex items-center justify-between p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5">
              <div>
                <p className="text-sm font-bold text-foreground">Reset Profile</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Revert all profile data to default values.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { if (confirm('Reset all profile data to defaults?')) handleReset(); }}
                className="rounded-2xl px-5 h-9 text-xs font-semibold border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
              >
                <RotateCcw size={14} className="mr-2" /> Reset
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
};

export default ProfilePage;
