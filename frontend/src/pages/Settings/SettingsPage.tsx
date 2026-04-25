import React, { useState } from 'react';
import {
  Settings, Moon, Sun, Bell, Cpu, Clock,
  PhoneCall, Flame, ClipboardList, Activity,
  RefreshCw, Shield, Timer, Volume2, Trash2, Database,
  Users, UserPlus, Mail, Lock, Crown, UserCheck, X, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { PageShell } from '../../ui/PageShell';
import { SectionCard } from '../../ui/SectionCard';
import { Button } from '../../ui/Button';
import { useTheme } from '../../state/themeStore';
import { useNotificationStore } from '../../state/notificationStore';
import { useAuth } from '../../state/authStore';
import { bGet, bPost, bDelete } from '../../data/backendApi';
import { cn } from '../../lib/utils';

const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { prefs, updatePrefs, notifications, clearAll } = useNotificationStore();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const unreadCount = notifications.filter(n => !n.read).length;

  // Team Members state
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '', role: 'employee' as 'admin' | 'employee' });
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['auth-users'],
    queryFn: () => bGet('/auth/users'),
    enabled: authUser?.role === 'admin',
  });
  const teamMembers: any[] = usersData?.users || [];

  const createMemberMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: string }) =>
      bPost('/auth/users', data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`${newMember.name} added successfully`);
        setNewMember({ name: '', email: '', password: '', role: 'employee' });
        setShowAddForm(false);
        queryClient.invalidateQueries({ queryKey: ['auth-users'] });
      } else {
        toast.error(res.error || 'Failed to add member');
      }
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to add member'),
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: string) => bDelete(`/auth/users/${id}`),
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['auth-users'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to remove member'),
  });

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-none">Settings</h1>
          <p className="text-muted-foreground font-medium mt-1">Configure your CRM preferences and notifications.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-10">

        {/* ── LEFT COLUMN ─────────────────────────────── */}
        <div className="lg:col-span-7 flex flex-col gap-8">

          {/* Team Members (Admin only) */}
          {authUser?.role === 'admin' && (
            <SectionCard title="Team Members" subtitle="Add and manage employee login accounts." icon={<Users size={18} className="text-primary" />}>
              <div className="space-y-4 py-2">

                {/* Member list */}
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/40 border border-border/50 group hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center border text-xs font-black",
                            member.role === 'admin'
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                              : "bg-primary/10 border-primary/20 text-primary"
                          )}>
                            {member.role === 'admin' ? <Crown size={14} /> : <UserCheck size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{member.name}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border",
                            member.role === 'admin'
                              ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                              : "text-primary bg-primary/10 border-primary/20"
                          )}>
                            {member.role}
                          </span>
                          {member.email !== authUser.email && (
                            <button
                              onClick={() => deleteMemberMutation.mutate(member.id)}
                              disabled={deleteMemberMutation.isPending}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:bg-rose-500/10 hover:text-rose-500 transition-all cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Member Form */}
                {showAddForm ? (
                  <div className="p-5 rounded-2xl bg-secondary/60 border border-primary/20 space-y-4">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">New Team Member</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Full Name</label>
                        <input
                          value={newMember.name}
                          onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                          placeholder="Simran Kaur"
                          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Role</label>
                        <select
                          value={newMember.role}
                          onChange={e => setNewMember(p => ({ ...p, role: e.target.value as 'admin' | 'employee' }))}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="employee">Employee</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Email</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                        <input
                          type="email"
                          value={newMember.email}
                          onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))}
                          placeholder="employee@company.com"
                          className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Password</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                        <input
                          type="password"
                          value={newMember.password}
                          onChange={e => setNewMember(p => ({ ...p, password: e.target.value }))}
                          placeholder="Set a secure password"
                          className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <Button
                        variant="primary"
                        className="flex-1 py-3 rounded-xl text-sm"
                        loading={createMemberMutation.isPending}
                        onClick={() => {
                          if (!newMember.name.trim() || !newMember.email.trim() || !newMember.password.trim()) {
                            toast.error('All fields are required');
                            return;
                          }
                          createMemberMutation.mutate(newMember);
                        }}
                      >
                        Add Member
                      </Button>
                      <Button variant="ghost" className="px-6 py-3 rounded-xl" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full py-5 rounded-2xl border-dashed border-2 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-sm font-bold text-muted-foreground hover:text-primary"
                    onClick={() => setShowAddForm(true)}
                  >
                    <UserPlus size={16} className="mr-2" /> Add New Team Member
                  </Button>
                )}
              </div>
            </SectionCard>
          )}

          {/* Appearance */}
          <SectionCard title="Appearance" subtitle="Customize the interface." icon={<Sun size={18} className="text-primary" />}>
            <div className="grid grid-cols-2 gap-6 py-2">
              {([
                { value: 'light' as const, label: 'Light Mode', icon: Sun },
                { value: 'dark' as const, label: 'Dark Mode', icon: Moon },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex flex-col items-center justify-center p-8 rounded-2xl border transition-all gap-4 group relative overflow-hidden cursor-pointer",
                    theme === opt.value
                      ? "bg-card border-primary ring-1 ring-primary/20 shadow-lg scale-[1.02]"
                      : "bg-secondary/50 border-border/50 text-muted-foreground hover:bg-secondary hover:border-border"
                  )}
                >
                  <div className={cn(
                    "p-4 rounded-2xl transition-all duration-300",
                    theme === opt.value ? "bg-primary/10 text-primary scale-110 shadow-inner" : "bg-accent/50 text-muted-foreground group-hover:scale-110"
                  )}>
                    <opt.icon size={32} />
                  </div>
                  <span className="text-[13px] font-bold tracking-tight">{opt.label}</span>
                  {theme === opt.value && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Notification Preferences */}
          <SectionCard title="Notification Alerts" subtitle="Choose which CRM events trigger notifications." icon={<Bell size={18} className="text-primary" />}>
            <div className="space-y-4 py-2">
              {([
                {
                  key: 'hotLeadAlerts' as const,
                  title: 'Hot Lead Alerts',
                  desc: 'Get notified when new hot leads are detected.',
                  icon: Flame,
                  iconColor: 'text-rose-500',
                  iconBg: 'bg-rose-500/10 border-rose-500/20',
                },
                {
                  key: 'callCompletedAlerts' as const,
                  title: 'Call Completed Alerts',
                  desc: 'Notified when calls finish or go active.',
                  icon: PhoneCall,
                  iconColor: 'text-emerald-500',
                  iconBg: 'bg-emerald-500/10 border-emerald-500/20',
                },
                {
                  key: 'taskDueAlerts' as const,
                  title: 'Task Due / Overdue Alerts',
                  desc: 'Alert when tasks are due within 4 hours or overdue.',
                  icon: ClipboardList,
                  iconColor: 'text-amber-500',
                  iconBg: 'bg-amber-500/10 border-amber-500/20',
                },
              ]).map(opt => (
                <div
                  key={opt.key}
                  className="flex items-center justify-between p-5 rounded-2xl bg-secondary/40 border border-border/50 group hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => {
                    const newVal = !prefs[opt.key];
                    updatePrefs({ [opt.key]: newVal });
                    toast.success(`${opt.title} ${newVal ? 'enabled' : 'disabled'}`);
                  }}
                >
                  <div className="flex items-center gap-5">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105", prefs[opt.key] ? opt.iconBg + ' ' + opt.iconColor : 'bg-accent/50 border-border text-muted-foreground')}>
                      <opt.icon size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground tracking-tight">{opt.title}</p>
                      <p className="text-[11px] font-medium text-muted-foreground">{opt.desc}</p>
                    </div>
                  </div>
                  <div className={cn("w-11 h-6 rounded-full relative transition-all duration-300 flex-shrink-0", prefs[opt.key] ? 'bg-primary' : "bg-zinc-300 dark:bg-zinc-700")}>
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md", prefs[opt.key] ? "left-6" : "left-1")} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* CRM Auto-Refresh */}
          <SectionCard title="CRM Auto-Refresh" subtitle="Automatically reload all CRM data at a set interval." icon={<RefreshCw size={18} className="text-primary" />}>
            <div className="p-6 rounded-2xl bg-secondary/40 border border-border/50 space-y-5">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-500 border border-teal-500/20 shadow-sm">
                  <Database size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground tracking-tight">Refresh Interval</p>
                  <p className="text-[11px] font-medium text-muted-foreground">Updates leads, stats, and graphs silently in the background.</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {([
                  { label: 'Off', value: 0 },
                  { label: '5s', value: 5 },
                  { label: '10s', value: 10 },
                  { label: '30s', value: 30 },
                  { label: '1 min', value: 60 },
                  { label: '2 min', value: 120 },
                  { label: '5 min', value: 300 },
                  { label: '10 min', value: 600 },
                ] as { label: string; value: number }[]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      updatePrefs({ crmRefreshInterval: opt.value });
                      toast.success(opt.value === 0 ? 'Auto-refresh disabled' : `CRM will refresh every ${opt.label}`);
                    }}
                    className={cn(
                      "py-3 rounded-xl text-[11px] font-bold transition-all border shadow-sm cursor-pointer",
                      prefs.crmRefreshInterval === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-accent"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {prefs.crmRefreshInterval > 0 && (
                <p className="text-[11px] text-teal-500 font-medium flex items-center gap-1.5">
                  <RefreshCw size={11} className="animate-spin" style={{ animationDuration: '3s' }} />
                  Auto-refreshing every {prefs.crmRefreshInterval >= 60 ? `${prefs.crmRefreshInterval / 60} min` : `${prefs.crmRefreshInterval}s`}
                </p>
              )}
            </div>
          </SectionCard>

          {/* Live Monitor Settings */}
          <SectionCard title="Live Monitor" subtitle="Configure real-time call monitoring." icon={<Activity size={18} className="text-primary" />}>
            <div className="space-y-6 py-2">
              {/* Poll Interval */}
              <div className="p-6 rounded-2xl bg-secondary/40 border border-border/50 space-y-5">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-sm">
                    <Timer size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground tracking-tight">Auto-Refresh Interval</p>
                    <p className="text-[11px] font-medium text-muted-foreground">How often the live call dashboard refreshes.</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[5, 10, 15, 30].map(sec => (
                    <button
                      key={sec}
                      onClick={() => {
                        updatePrefs({ livePollInterval: sec });
                        toast.success(`Poll interval set to ${sec}s`);
                      }}
                      className={cn(
                        "py-3 rounded-xl text-[11px] font-bold transition-all border shadow-sm cursor-pointer",
                        prefs.livePollInterval === sec
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-accent"
                      )}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Notifications */}
              <div className="p-6 rounded-2xl bg-secondary/40 border border-border/50 space-y-5">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20 shadow-sm">
                    <Bell size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground tracking-tight">Max Stored Notifications</p>
                    <p className="text-[11px] font-medium text-muted-foreground">Keep the latest N notifications in the bell icon.</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[20, 50, 100, 200].map(max => (
                    <button
                      key={max}
                      onClick={() => {
                        updatePrefs({ maxNotifications: max });
                        toast.success(`Max notifications set to ${max}`);
                      }}
                      className={cn(
                        "py-3 rounded-xl text-[11px] font-bold transition-all border shadow-sm cursor-pointer",
                        prefs.maxNotifications === max
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-accent"
                      )}
                    >
                      {max}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────── */}
        <div className="lg:col-span-5 flex flex-col gap-8">

          {/* Notification Summary */}
          <SectionCard title="Notification Status" subtitle="Current alert state." icon={<Bell size={18} className="text-primary" />}>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-secondary/40 border border-border/50 text-center">
                  <p className="text-2xl font-bold text-foreground">{notifications.length}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mt-1">Total</p>
                </div>
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center">
                  <p className="text-2xl font-bold text-primary">{unreadCount}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mt-1">Unread</p>
                </div>
              </div>

              {/* Breakdown by type */}
              <div className="space-y-2">
                {([
                  { type: 'hot_lead', label: 'Hot Lead Alerts', icon: Flame, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                  { type: 'call_completed', label: 'Call Completed', icon: PhoneCall, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { type: 'call_active', label: 'Active Calls', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { type: 'task_due', label: 'Tasks Due', icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { type: 'task_overdue', label: 'Tasks Overdue', icon: Clock, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                ] as const).map(item => {
                  const count = notifications.filter(n => n.type === item.type).length;
                  if (count === 0) return null;
                  return (
                    <div key={item.type} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/40">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.bg, item.color)}>
                        <item.icon size={14} />
                      </div>
                      <span className="text-xs font-semibold text-foreground flex-1">{item.label}</span>
                      <span className="text-xs font-bold text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>

              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full text-xs font-bold text-muted-foreground hover:text-rose-500 py-5 rounded-2xl border-dashed border-2 border-border/60 hover:border-rose-500/40 hover:bg-rose-500/5 transition-all"
                  onClick={() => { clearAll(); toast.success("All notifications cleared"); }}
                >
                  <Trash2 size={14} className="mr-2" /> Clear All Notifications
                </Button>
              )}
            </div>
          </SectionCard>

          {/* System Info */}
          <SectionCard title="System Status" subtitle="Connection and sync info." icon={<Shield size={18} className="text-primary" />}>
            <div className="space-y-3 py-2">
              {([
                { label: 'Database', status: 'Connected', color: 'text-emerald-500', dot: 'bg-emerald-500' },
                { label: 'Google Sheet Sync', status: 'Active', color: 'text-emerald-500', dot: 'bg-emerald-500' },
                { label: 'Live Poll Interval', status: `${prefs.livePollInterval}s`, color: 'text-blue-500', dot: 'bg-blue-500' },
                { label: 'CRM Auto-Refresh', status: prefs.crmRefreshInterval > 0 ? (prefs.crmRefreshInterval >= 60 ? `${prefs.crmRefreshInterval / 60}m` : `${prefs.crmRefreshInterval}s`) : 'Off', color: prefs.crmRefreshInterval > 0 ? 'text-teal-500' : 'text-muted-foreground', dot: prefs.crmRefreshInterval > 0 ? 'bg-teal-500' : 'bg-muted-foreground' },
                { label: 'Notification Alerts', status: [prefs.hotLeadAlerts && 'Hot', prefs.callCompletedAlerts && 'Calls', prefs.taskDueAlerts && 'Tasks'].filter(Boolean).join(', ') || 'All off', color: prefs.hotLeadAlerts || prefs.callCompletedAlerts || prefs.taskDueAlerts ? 'text-emerald-500' : 'text-muted-foreground', dot: prefs.hotLeadAlerts || prefs.callCompletedAlerts || prefs.taskDueAlerts ? 'bg-emerald-500' : 'bg-muted-foreground' },
              ]).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/40 hover:border-primary/20 transition-all">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-1.5 h-1.5 rounded-full", item.dot)} />
                    <span className={cn("text-[10px] font-bold uppercase", item.color)}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Active Preferences Summary */}
          <SectionCard title="Current Configuration" subtitle="Quick overview of active settings." icon={<Settings size={18} className="text-primary" />}>
            <div className="space-y-2 py-2">
              {([
                { label: 'Theme', value: theme === 'dark' ? 'Dark Mode' : 'Light Mode' },
                { label: 'Hot Lead Alerts', value: prefs.hotLeadAlerts ? 'Enabled' : 'Disabled' },
                { label: 'Call Alerts', value: prefs.callCompletedAlerts ? 'Enabled' : 'Disabled' },
                { label: 'Task Alerts', value: prefs.taskDueAlerts ? 'Enabled' : 'Disabled' },
                { label: 'Live Poll Interval', value: `Every ${prefs.livePollInterval}s` },
                { label: 'CRM Auto-Refresh', value: prefs.crmRefreshInterval > 0 ? `Every ${prefs.crmRefreshInterval >= 60 ? `${prefs.crmRefreshInterval / 60} min` : `${prefs.crmRefreshInterval}s`}` : 'Disabled' },
                { label: 'Max Notifications', value: `${prefs.maxNotifications}` },
              ]).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-1 border-b border-border/30 last:border-0">
                  <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
                  <span className="text-[11px] font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
};

export default SettingsPage;
