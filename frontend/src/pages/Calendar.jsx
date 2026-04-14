import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { calendarAPI, intelligenceAPI } from '../services/api';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const TYPE_COLORS = {
  event:    { bg: '#6366f1', border: '#4f46e5' },
  followup: { bg: '#3b82f6', border: '#1d4ed8' },
  deadline: { bg: '#ef4444', border: '#b91c1c' },
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(Views.WEEK);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [calendarRes, tasksRes] = await Promise.all([
        calendarAPI.list(),
        intelligenceAPI.tasks.list({ limit: 100 }),
      ]);

      const calendarItems = (calendarRes.data || []).map((it) => ({
        id: it.id,
        title: it.title,
        start: new Date(it.start),
        end: new Date(it.end),
        allDay: !!it.all_day,
        resource: it,
      }));
      setItems(calendarItems);
      setTasks(tasksRes.data || []);
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError(err.response?.data?.detail || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectEvent = useCallback((calendarEvent) => {
    const r = calendarEvent.resource;
    if (r?.event_id) navigate(`/events/${r.event_id}`);
  }, [navigate]);

  const applyUpdate = useCallback(async (calendarEvent, start, end) => {
    const r = calendarEvent.resource;
    if (!r) return;
    const previous = items;
    setItems((cur) => cur.map((x) => (x.id === calendarEvent.id ? { ...x, start, end } : x)));
    try {
      await calendarAPI.update(r.id, {
        type: r.type,
        start: start.toISOString(),
        end: end ? end.toISOString() : null,
      });
    } catch (err) {
      console.error('Calendar update failed:', err);
      setItems(previous);
      alert('Could not save the change: ' + (err.response?.data?.detail || err.message));
    }
  }, [items]);

  const handleEventDrop   = useCallback(({ event, start, end }) => applyUpdate(event, start, end), [applyUpdate]);
  const handleEventResize = useCallback(({ event, start, end }) => applyUpdate(event, start, end), [applyUpdate]);

  const handleToggleTaskStatus = async (task) => {
    try {
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      await intelligenceAPI.tasks.update(task.id, { status: newStatus });
      loadData();
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Failed to update task status');
    }
  };

  const eventPropGetter = useCallback((calendarEvent) => {
    const colors = TYPE_COLORS[calendarEvent.resource?.type] || TYPE_COLORS.event;
    return {
      style: {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: 'white',
      },
    };
  }, []);

  const components = useMemo(() => ({
    event: ({ event }) => {
      const t = event.resource?.type;
      const label = t === 'followup' ? 'Follow-up' : t === 'deadline' ? 'Deadline' : 'Event';
      return (
        <div className="text-xs leading-tight">
          <div className="font-semibold truncate">{event.title}</div>
          <div className="opacity-75">{label}</div>
        </div>
      );
    },
  }), []);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="skeleton h-[640px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full px-6 py-6 space-y-6">
      {/* Section header — aligned with card gutter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-900">Calendar</h2>
          <p className="text-sm text-ink-500 mt-0.5">Events, follow-ups and deadlines in one view.</p>
        </div>
        <Link to="/events/new" className="btn-primary">Create Event</Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
      )}

      {/* Calendar card */}
      <div className="rounded-2xl shadow-md bg-white/95 border border-ink-200/60 p-5">
        {/* Legend row */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
          <Legend color={TYPE_COLORS.event.bg}    label="Event" />
          <Legend color={TYPE_COLORS.followup.bg} label="Follow-up" />
          <Legend color={TYPE_COLORS.deadline.bg} label="Deadline" />
          <span className="text-ink-400 ml-auto hidden sm:inline">Drag to reschedule · resize to adjust range</span>
        </div>

        <div className="h-[600px]">
          <DnDCalendar
            localizer={localizer}
            events={items}
            startAccessor="start"
            endAccessor="end"
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            view={view}
            onView={setView}
            onSelectEvent={handleSelectEvent}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            draggableAccessor={() => true}
            resizableAccessor={() => true}
            resizable
            selectable
            eventPropGetter={eventPropGetter}
            components={components}
            style={{ height: '100%' }}
          />
        </div>
      </div>

      {/* Tasks card */}
      <div className="rounded-2xl shadow-md bg-white/95 border border-ink-200/60 p-5">
        <h3 className="text-base font-semibold text-ink-900 mb-4">All Tasks</h3>
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-ink-500 text-center py-6 text-sm">No tasks found</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  task.status === 'completed' ? 'border-primary-200 bg-primary-50/50' : 'border-ink-200 bg-white'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <Link to={`/events/${task.event_id}`} className="font-medium text-ink-900 hover:text-primary-600">
                    {task.event_title || 'Untitled Event'}
                  </Link>
                  <p className="text-sm text-ink-500 truncate">{task.deadline_description}</p>
                  <p className="text-xs text-ink-400 mt-1">
                    Due: {new Date(task.deadline_due_date).toLocaleString()}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-2 shrink-0">
                  <span className={`badge ${task.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                    {task.status}
                  </span>
                  <button onClick={() => handleToggleTaskStatus(task)} className="btn-secondary text-xs py-1.5">
                    {task.status === 'pending' ? 'Mark Complete' : 'Mark Pending'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
      <span className="text-ink-600 font-medium">{label}</span>
    </span>
  );
}
