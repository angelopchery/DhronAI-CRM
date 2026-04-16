import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientsAPI, intelligenceAPI, eventsAPI } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Building2,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Mic,
  Target,
  ArrowRight,
  Activity,
  Zap,
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    clients: 0,
    upcomingTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    recentEvents: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [clientsRes, tasksRes, eventsRes] = await Promise.all([
        clientsAPI.list({ limit: 1 }),
        intelligenceAPI.tasks.list({ limit: 10 }),
        eventsAPI.list({ limit: 6 }),
      ]);

      const tasks = tasksRes.data || [];
      const events = eventsRes.data?.events || [];

      setStats({
        clients: clientsRes.data.total || 0,
        upcomingTasks: tasks.length,
        pendingTasks: tasks.filter((t) => t.status === 'pending').length,
        completedTasks: tasks.filter((t) => t.status === 'completed').length,
        recentEvents: eventsRes.data?.total || events.length,
      });

      const sortedTasks = [...tasks]
        .sort((a, b) => new Date(a.deadline_due_date) - new Date(b.deadline_due_date))
        .slice(0, 5);
      setRecentTasks(sortedTasks);

      setRecentEvents(events.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardSkeleton />;

  const completionRate =
    stats.upcomingTasks > 0 ? Math.round((stats.completedTasks / stats.upcomingTasks) * 100) : 0;

  const kpis = [
    {
      name: 'Total Clients', value: stats.clients, icon: Building2,
      accent: 'from-primary-500 to-accent-500', href: '/clients',
      delta: 'Active directory', deltaUp: true,
    },
    {
      name: 'Upcoming Tasks', value: stats.upcomingTasks, icon: CalendarIcon,
      accent: 'from-accent-500 to-primary-500', href: '/calendar',
      delta: `${stats.pendingTasks} pending`, deltaUp: stats.pendingTasks === 0,
    },
    {
      name: 'In Progress', value: stats.pendingTasks, icon: Clock,
      accent: 'from-amber-400 to-primary-500', href: '/calendar',
      delta: 'Awaiting action', deltaUp: false,
    },
    {
      name: 'Completed', value: stats.completedTasks, icon: CheckCircle2,
      accent: 'from-primary-400 to-accent-600', href: '/calendar',
      delta: `${completionRate}% rate`, deltaUp: completionRate >= 50,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ========== Hero / AI banner ========== */}
      <section className="relative overflow-hidden rounded-3xl bg-ink-950 text-white p-7 lg:p-10 shadow-lift">
        {/* Layered gradient for depth — darker base + brand radial glow */}
        <div className="absolute inset-0 bg-brand-radial opacity-90 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 15% 20%, rgba(34,197,94,0.25), transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(20,184,166,0.22), transparent 55%)',
          }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 ai-chip mb-4">
              <Sparkles className="w-3 h-3" /> AI-powered intelligence
            </span>
            <h2 className="hero-headline text-3xl lg:text-4xl xl:text-[2.75rem]">
              Welcome back — your{' '}
              <span className="gradient-text-bright">intelligence partner</span>{' '}
              is live.
            </h2>
            <p className="mt-3 text-ink-300 max-w-xl text-sm lg:text-base font-normal">
              Upload a meeting, capture a call, or review what AI surfaced for you today.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to="/events/new" className="btn-primary">
              <Mic className="w-4 h-4" /> New Event
            </Link>
            <Link to="/calendar" className="btn-secondary bg-white/10 text-white border-white/20 hover:bg-white/20">
              Calendar
            </Link>
          </div>
        </div>
      </section>

      {/* ========== KPIs ========== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => <KPICard key={k.name} {...k} />)}
      </section>

      {/* ========== Main grid (activity + insights) ========== */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed — 2 cols */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-ink-100 flex items-center justify-center text-ink-700">
                <Activity className="w-4 h-4" />
              </div>
              <h3>Recent Activity</h3>
            </div>
            <Link to="/events" className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <EmptyState icon={CalendarIcon} message="No events yet" cta={{ to: '/events/new', label: 'Create Event' }} />
          ) : (
            <ol className="relative border-s border-ink-200 ml-3 space-y-5">
              {recentEvents.map((e) => <TimelineItem key={e.id} event={e} />)}
            </ol>
          )}
        </div>

        {/* AI insights column */}
        <div className="space-y-6">
          <InsightCard
            title="Transcription Pipeline"
            description={`${stats.recentEvents} events processed with AI speech recognition.`}
            metric={`${completionRate}%`}
            metricLabel="Task completion"
            icon={Sparkles}
            progress={completionRate}
          />
          <InsightCard
            title="Smart Scheduling"
            description={`${stats.pendingTasks} tasks extracted from transcripts await review.`}
            metric={stats.pendingTasks}
            metricLabel="Actionable items"
            icon={Target}
            progress={stats.upcomingTasks ? (stats.pendingTasks / stats.upcomingTasks) * 100 : 0}
            variant="accent"
          />
        </div>
      </section>

      {/* ========== Upcoming tasks ========== */}
      <section className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-ink-100 flex items-center justify-center text-ink-700">
              <Zap className="w-4 h-4" />
            </div>
            <h3>Upcoming Tasks</h3>
            <span className="ai-chip">AI extracted</span>
          </div>
          <Link to="/calendar" className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTasks.length === 0 ? (
          <EmptyState icon={AlertCircle} message="No upcoming tasks" cta={{ to: '/events/new', label: 'Create Event' }} />
        ) : (
          <ul className="divide-y divide-ink-100">
            {recentTasks.map((task) => <TaskRow key={task.id} task={task} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

// ===================================================================
// Sub-components
// ===================================================================

function KPICard({ name, value, icon: Icon, accent, href, delta, deltaUp }) {
  return (
    <Link to={href} className="card card-hover group relative overflow-hidden">
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${accent} opacity-10 group-hover:opacity-20 transition-opacity`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-soft`}>
            <Icon className="w-5 h-5 text-white" />
          </span>
          <span className={deltaUp ? 'kpi-delta-up' : 'kpi-delta-down'}>
            <TrendingUp className={`w-3 h-3 ${deltaUp ? '' : 'rotate-180'}`} /> {delta}
          </span>
        </div>
        <p className="text-xs text-ink-500 font-medium uppercase tracking-wider">{name}</p>
        <p className="text-3xl font-bold text-ink-900 mt-1">{value}</p>
      </div>
    </Link>
  );
}

function TimelineItem({ event }) {
  const when = new Date(event.datetime);
  return (
    <li className="ms-4">
      <div className="absolute w-3 h-3 rounded-full -start-1.5 mt-1.5 bg-brand-gradient ring-4 ring-white" />
      <Link to={`/events/${event.id}`} className="block group">
        <time className="text-xs text-ink-400">{formatDistanceToNow(when, { addSuffix: true })}</time>
        <h4 className="text-sm font-semibold text-ink-900 group-hover:text-primary-600 transition-colors">
          {event.title}
        </h4>
        <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">
          <span className="badge badge-muted capitalize">{event.type || 'event'}</span>
          <span>{format(when, 'MMM d, yyyy • HH:mm')}</span>
        </div>
      </Link>
    </li>
  );
}

function InsightCard({ title, description, metric, metricLabel, icon: Icon, progress, variant }) {
  const isAccent = variant === 'accent';
  return (
    <div className="card card-hover relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl opacity-20 ${isAccent ? 'bg-accent-500' : 'bg-primary-500'}`} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-9 h-9 rounded-xl ${isAccent ? 'bg-accent-50 text-accent-600' : 'bg-primary-50 text-primary-600'} flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
          </span>
          <h4 className="text-sm font-semibold text-ink-900">{title}</h4>
          <span className="ai-chip ml-auto">AI</span>
        </div>
        <p className="text-xs text-ink-500 leading-relaxed mb-4">{description}</p>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-ink-900">{metric}</span>
          <span className="text-xs text-ink-500">{metricLabel}</span>
        </div>
        <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${isAccent ? 'bg-gradient-to-r from-accent-500 to-primary-500' : 'bg-brand-gradient'}`}
            style={{ width: `${Math.min(100, Math.max(0, progress || 0))}%`, transition: 'width 0.8s ease' }}
          />
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  const due = new Date(task.deadline_due_date);
  const isOverdue = due.getTime() < Date.now() && task.status !== 'completed';
  return (
    <li>
      <Link to={`/events/${task.event_id}`} className="flex items-center gap-4 px-2 py-3 -mx-2 rounded-xl hover:bg-ink-50 transition-colors group">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          task.status === 'completed' ? 'bg-primary-50 text-primary-600' : isOverdue ? 'bg-red-50 text-red-500' : 'bg-ink-100 text-ink-500'
        }`}>
          {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink-900 truncate group-hover:text-primary-600 transition-colors">
              {task.event_title || 'Untitled Event'}
            </p>
            <span className="ai-chip">AI</span>
          </div>
          <p className="text-xs text-ink-500 truncate mt-0.5">{task.deadline_description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-ink-800">{format(due, 'MMM d')}</p>
          <p className="text-[10px] text-ink-400">{format(due, 'HH:mm')}</p>
        </div>
        <span className={`badge ${
          task.status === 'completed' ? 'badge-success' : isOverdue ? 'badge-danger' : 'badge-warning'
        }`}>
          {isOverdue && task.status !== 'completed' ? 'overdue' : task.status}
        </span>
      </Link>
    </li>
  );
}

function EmptyState({ icon: Icon, message, cta }) {
  return (
    <div className="text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-ink-100 text-ink-400 mx-auto mb-3 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm text-ink-500 mb-4">{message}</p>
      {cta && (
        <Link to={cta.to} className="btn-primary">{cta.label}</Link>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-40 rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="skeleton h-72 lg:col-span-2" />
        <div className="skeleton h-72" />
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}
