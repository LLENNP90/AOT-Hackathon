'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiShift, Employee, OptimisationResult, ProposedShift } from '@/lib/api';

const STATIONS = ['Espresso Bar', 'Brew Bar', 'Register', 'Breakroom', 'Off Duty'];

interface ScheduleShift {
  id: string;
  employeeId: string;
  station: string;
  dateKey: string;
  day: string;
  start: string;
  end: string;
  colIndex?: number;
  totalCols?: number;
}

const timeToDecimal = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

const START_HOUR = 7;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS_ARRAY = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const getWeekStart = (date: Date) => {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  return weekStart;
};

const buildWeekDays = (weekStart: Date) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      name: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: String(date.getDate()),
      dateKey: formatDateKey(date),
    };
  });

const apiShiftToScheduleShift = (shift: ApiShift): ScheduleShift => {
  const startDate = new Date(shift.startTime);
  const endDate = new Date(shift.endTime);
  return {
    id: shift.id,
    employeeId: shift.employeeId,
    station: shift.station ?? "Register",
    dateKey: formatDateKey(startDate),
    day: startDate.toLocaleDateString("en-US", { weekday: "short" }),
    start: formatTime(startDate),
    end: formatTime(endDate),
  };
};

const getInitials = (name: string) =>
  name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

const getEmployeeColor = (index: number) => {
  const colors = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-yellow-500",
  ];
  return colors[index % colors.length];
};

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));

  const daysOfWeek = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const selectedDay = daysOfWeek.find((day) => day.dateKey === selectedDateKey)?.name ?? "";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ScheduleShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Shift modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formStation, setFormStation] = useState("Espresso Bar");
  const [formStart, setFormStart] = useState("08:00");
  const [formEnd, setFormEnd] = useState("12:00");

  // Optimisation state
  const [isOptimiseOpen, setIsOptimiseOpen] = useState(false);
  const [optimiseStation, setOptimiseStation] = useState("Register");
  const [optimiseStart, setOptimiseStart] = useState("09:00");
  const [optimiseEnd, setOptimiseEnd] = useState("17:00");
  const [optimiseStaffCount, setOptimiseStaffCount] = useState("1");
  const [optimisationResult, setOptimisationResult] = useState<OptimisationResult | null>(null);
  const [optimisationLoading, setOptimisationLoading] = useState(false);
  const [optimisationError, setOptimisationError] = useState("");

  // Inline edit state for proposed shifts
  const [editingProposedIndex, setEditingProposedIndex] = useState<number | null>(null);

  const loadSchedule = async () => {
    try {
      setError("");
      setLoading(true);
      const [employeeData, shiftData] = await Promise.all([
        api.listEmployees(),
        api.listShifts(),
      ]);
      setEmployees(employeeData.employees);
      setShifts(shiftData.shifts.map(apiShiftToScheduleShift));
      if (!formEmployeeId && employeeData.employees.length > 0) {
        setFormEmployeeId(employeeData.employees[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED_TO_LOAD_SCHEDULE");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const activeShifts = useMemo(() => {
    const dayShifts = shifts.filter((shift) => shift.dateKey === selectedDateKey);
    const sorted = [...dayShifts].sort((a, b) => timeToDecimal(a.start) - timeToDecimal(b.start));
    const columns: ScheduleShift[][] = [];

    sorted.forEach((shift) => {
      let placed = false;
      const startDec = timeToDecimal(shift.start);
      for (let c = 0; c < columns.length; c++) {
        const lastShiftInCol = columns[c][columns[c].length - 1];
        if (startDec >= timeToDecimal(lastShiftInCol.end)) {
          columns[c].push(shift);
          shift.colIndex = c;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([shift]);
        shift.colIndex = columns.length - 1;
      }
    });

    sorted.forEach((shift) => { shift.totalCols = columns.length || 1; });
    return sorted;
  }, [shifts, selectedDateKey]);

  const handleOpenAddModal = (hour: number) => {
    if (employees.length === 0) { alert("Add an employee first."); return; }
    setEditingShiftId(null);
    setFormEmployeeId(employees[0].id);
    setFormStation(STATIONS[0]);
    setFormStart(`${hour.toString().padStart(2, "0")}:00`);
    setFormEnd(`${(hour + 4).toString().padStart(2, "0")}:00`);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, shift: ScheduleShift) => {
    e.stopPropagation();
    setEditingShiftId(shift.id);
    setFormEmployeeId(shift.employeeId);
    setFormStation(shift.station);
    setFormStart(shift.start);
    setFormEnd(shift.end);
    setIsModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId) return;
    if (timeToDecimal(formStart) >= timeToDecimal(formEnd)) {
      alert("Start time must be before end time!");
      return;
    }
    const startTime = new Date(`${selectedDateKey}T${formStart}:00`).toISOString();
    const endTime = new Date(`${selectedDateKey}T${formEnd}:00`).toISOString();

    if (editingShiftId !== null) {
      await api.updateShift(editingShiftId, {
        employeeId: formEmployeeId,
        newStartTime: startTime,
        newEndTime: endTime,
        station: formStation,
      });
    } else {
      await api.createShift({ employeeId: formEmployeeId, startTime, endTime, station: formStation });
    }
    setIsModalOpen(false);
    await loadSchedule();
  };

  const handleDeleteShift = async () => {
    if (editingShiftId !== null) {
      await api.deleteShift(editingShiftId);
      setIsModalOpen(false);
      await loadSchedule();
    }
  };

  const handlePreviewOptimisation = async (e: React.FormEvent) => {
    e.preventDefault();
    const startHour = Math.floor(timeToDecimal(optimiseStart));
    const endHour = Math.floor(timeToDecimal(optimiseEnd));
    const requiredStaff = Number(optimiseStaffCount);

    if (startHour >= endHour || Number.isNaN(requiredStaff) || requiredStaff < 1) {
      setOptimisationError("Check the optimisation inputs.");
      return;
    }

    const hourlyNeeds: Record<string, number> = {};
    for (let hour = startHour; hour < endHour; hour++) {
      hourlyNeeds[hour.toString()] = requiredStaff;
    }

    try {
      setOptimisationError("");
      setOptimisationLoading(true);
      const result = await api.previewOptimisation({
        weekDemand: [{ date: selectedDateKey, requirements: [{ station: optimiseStation, hourlyNeeds }] }],
      });
      setOptimisationResult(result);
      setEditingProposedIndex(null);
    } catch (err) {
      setOptimisationError(err instanceof Error ? err.message : "OPTIMISATION_FAILED");
    } finally {
      setOptimisationLoading(false);
    }
  };

  const handleRemoveProposedShift = (index: number) => {
    if (!optimisationResult?.proposedShifts) return;
    const updated = optimisationResult.proposedShifts.filter((_, i) => i !== index);
    setOptimisationResult({ ...optimisationResult, proposedShifts: updated, shiftsGenerated: updated.length });
    if (editingProposedIndex === index) setEditingProposedIndex(null);
  };

  const handleUpdateProposedShift = (index: number, patch: Partial<ProposedShift>) => {
    if (!optimisationResult?.proposedShifts) return;
    const updated = optimisationResult.proposedShifts.map((s, i) => i === index ? { ...s, ...patch } : s);
    setOptimisationResult({ ...optimisationResult, proposedShifts: updated });
  };

  const handleApproveOptimisation = async () => {
    if (!optimisationResult?.proposedShifts?.length) return;
    try {
      setOptimisationError("");
      setOptimisationLoading(true);
      await api.approveOptimisation({
        proposedShifts: optimisationResult.proposedShifts,
        metrics: {
          estimatedOldCost: optimisationResult.estimatedOldCost,
          totalCost: optimisationResult.totalCost,
          moneySaved: optimisationResult.moneySaved,
          totalHoursOptimized: optimisationResult.totalHoursOptimized,
        },
      });
      setIsOptimiseOpen(false);
      setOptimisationResult(null);
      await loadSchedule();
    } catch (err) {
      setOptimisationError(err instanceof Error ? err.message : "APPROVE_OPTIMISATION_FAILED");
    } finally {
      setOptimisationLoading(false);
    }
  };

  const employeeHours = useMemo(() => {
    const stats: Record<string, number> = {};
    shifts
      .filter((shift) => shift.dateKey === selectedDateKey)
      .forEach((shift) => {
        const duration = timeToDecimal(shift.end) - timeToDecimal(shift.start);
        stats[shift.employeeId] = (stats[shift.employeeId] || 0) + duration;
      });
    return stats;
  }, [shifts, selectedDateKey]);

  return (
    <div className="h-screen w-screen bg-[#0b0e14] text-white p-6 font-sans flex flex-col overflow-hidden">
      <main className="max-w-[1440px] w-full h-full mx-auto flex flex-col gap-4 overflow-hidden min-h-0">

        <header className="bg-[#1e2130]/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <a href="/home" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </a>
              <div>
                <h1 className="text-xl font-bold bg-white bg-clip-text text-transparent">Shift Management</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setOptimisationResult(null); setOptimisationError(""); setIsOptimiseOpen(true); }}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                <span>Optimise Day</span>
              </button>
              <button
                onClick={() => handleOpenAddModal(9)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Schedule Shift</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 max-w-xl mx-auto w-full">
            {daysOfWeek.map((day) => {
              const isActive = selectedDateKey === day.dateKey;
              return (
                <button
                  key={day.dateKey}
                  onClick={() => setSelectedDateKey(day.dateKey)}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                    isActive
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                      : "hover:bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider font-mono">{day.name}</span>
                  <span className="text-lg font-black mt-0.5">{day.date}</span>
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex-grow flex gap-4 min-h-0">
          
          <aside className="w-80 bg-[#12141d] p-5 rounded-3xl border border-white/5 flex flex-col justify-between shrink-0 overflow-hidden">
            <div>
              <h3 className="text-sm font-bold text-gray-400 font-mono tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                ACTIVE ROSTER & HOURS
              </h3>
              
              <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
                {employees.map((emp, index) => {
                  const hoursScheduled = employeeHours[emp.id] || 0;
                  return (
                    <div
                      key={emp.id}
                      className="p-3 rounded-2xl bg-[#1e2130]/40 border border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${getEmployeeColor(index)} flex items-center justify-center font-bold text-xs text-white`}>
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs">{emp.name}</h4>
                          <p className="text-[10px] text-gray-500">{emp.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-blue-400">{hoursScheduled.toFixed(1)} hrs</span>
                        <p className="text-[9px] text-gray-600">Selected day</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="flex-1 bg-[#12141d] p-6 rounded-3xl border border-white/5 flex flex-col overflow-hidden">
            <h3 className="text-sm font-bold text-gray-400 font-mono tracking-wider mb-4 shrink-0 flex items-center gap-2">
              <span>TIMELINE VIEW &bull; {selectedDay}day</span>
            </h3>
            <div className="flex-grow overflow-y-auto relative pr-1 min-h-0">
              <div className="relative flex min-h-[700px] w-full">
                
                <div className="w-16 flex flex-col justify-between shrink-0 select-none">
                  {HOURS_ARRAY.map((hour) => (
                    <div key={hour} className="h-[50px] text-xs font-mono text-gray-500 font-bold pr-3 text-right">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                <div className="flex-grow relative border-l border-white/10">
                  {HOURS_ARRAY.map((hour, idx) => {
                    const topPos = (idx / TOTAL_HOURS) * 100;
                    return (
                      <div 
                        key={hour}
                        className="absolute left-0 right-0 border-t border-white/10 flex items-center"
                        style={{ top: `${topPos}%` }}
                      >
                        {hour !== END_HOUR && (
                          <button
                            onClick={() => handleOpenAddModal(hour)}
                            className="absolute left-0 w-full h-[50px] bg-blue-500/0 hover:bg-blue-500/5 flex items-center pl-4 text-xs text-blue-400 font-bold opacity-0 hover:opacity-100 transition-all cursor-pointer"
                            style={{ transform: 'translateY(0%)' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Add shift at {hour}:00
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <AnimatePresence>
                    {activeShifts.map((shift) => {
                      const emp = employees.find((employee) => employee.id === shift.employeeId);
                      const startDec = timeToDecimal(shift.start);
                      const endDec = timeToDecimal(shift.end);
                      const topPct = ((startDec - START_HOUR) / TOTAL_HOURS) * 100;
                      const heightPct = ((endDec - startDec) / TOTAL_HOURS) * 100;
                      const totalCols = shift.totalCols || 1;
                      const colIndex = shift.colIndex || 0;
                      const colWidth = 100 / totalCols;
                      const colLeft = colIndex * colWidth;

                      return (
                        <motion.div
                          key={shift.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={(e) => handleOpenEditModal(e, shift)}
                          className="absolute p-2.5 rounded-xl border cursor-pointer hover:brightness-110 flex flex-col justify-between shadow-xl transition-all"
                          style={{
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                            left: `${colLeft}%`,
                            width: `calc(${colWidth}% - 4px)`,
                            backgroundColor: shift.station === 'Espresso Bar' ? 'rgba(59, 130, 246, 0.15)' :
                                             shift.station === 'Brew Bar' ? 'rgba(16, 185, 129, 0.15)' :
                                             shift.station === 'Register' ? 'rgba(168, 85, 247, 0.15)' :
                                             'rgba(245, 158, 11, 0.15)',
                            borderColor: shift.station === 'Espresso Bar' ? '#3b82f6' :
                                         shift.station === 'Brew Bar' ? '#10b981' :
                                         shift.station === 'Register' ? '#a855f7' :
                                         '#f59e0b',
                            zIndex: 10,
                          }}
                        >
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{
                                backgroundColor: shift.station === 'Espresso Bar' ? '#3b82f6' :
                                                 shift.station === 'Brew Bar' ? '#10b981' :
                                                 shift.station === 'Register' ? '#a855f7' :
                                                 '#f59e0b'
                              }}></span>
                              <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{
                                color: shift.station === 'Espresso Bar' ? '#60a5fa' :
                                       shift.station === 'Brew Bar' ? '#34d399' :
                                       shift.station === 'Register' ? '#c084fc' :
                                       '#fbbf24'
                              }}>
                                {shift.station}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-white mt-1 truncate">{emp?.name ?? "Unknown Employee"}</h4>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono mt-1 shrink-0">
                            <span>{shift.start} - {shift.end}</span>
                            <span className="text-gray-500">{(endDec - startDec).toFixed(1)}h</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ── Optimise Modal ── */}
      <AnimatePresence>
        {isOptimiseOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#1e2130] border border-white/10 p-6 rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)]"
            >
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-lg font-bold">Optimise {selectedDay} Schedule</h3>
                  <p className="text-xs text-gray-400 font-mono">{selectedDateKey}</p>
                </div>
                <button
                  onClick={() => setIsOptimiseOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <form onSubmit={handlePreviewOptimisation} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Station</label>
                  <select
                    value={optimiseStation}
                    onChange={(e) => setOptimiseStation(e.target.value)}
                    className="w-full bg-[#12141d] border border-white/10 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-500"
                  >
                    {STATIONS.filter((s) => s !== "Off Duty").map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Start</label>
                  <input
                    type="time" value={optimiseStart} min="07:00" max="21:00"
                    onChange={(e) => setOptimiseStart(e.target.value)}
                    className="w-full bg-[#12141d] border border-white/10 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">End</label>
                  <input
                    type="time" value={optimiseEnd} min="07:00" max="21:00"
                    onChange={(e) => setOptimiseEnd(e.target.value)}
                    className="w-full bg-[#12141d] border border-white/10 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Staff Needed</label>
                  <input
                    type="number" value={optimiseStaffCount} min="1"
                    onChange={(e) => setOptimiseStaffCount(e.target.value)}
                    className="w-full bg-[#12141d] border border-white/10 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={optimisationLoading}
                  className="md:col-span-4 col-span-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white p-2.5 rounded-xl text-sm font-bold transition-all"
                >
                  {optimisationLoading ? "Optimising..." : "Preview Suggested Schedule"}
                </button>
              </form>

              {optimisationError && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {optimisationError}
                </div>
              )}

              {optimisationResult && (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-[#12141d] border border-white/10 p-3">
                      <p className="text-[10px] text-gray-500 font-mono uppercase">Generated</p>
                      <p className="text-lg font-bold">{optimisationResult.proposedShifts?.length ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-[#12141d] border border-white/10 p-3">
                      <p className="text-[10px] text-gray-500 font-mono uppercase">Cost</p>
                      <p className="text-lg font-bold">RM {optimisationResult.totalCost.toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl bg-[#12141d] border border-white/10 p-3">
                      <p className="text-[10px] text-gray-500 font-mono uppercase">Saved</p>
                      <p className="text-lg font-bold text-emerald-400">RM {optimisationResult.moneySaved.toFixed(2)}</p>
                    </div>
                  </div>

                  {optimisationResult.coverage && (
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="rounded-xl bg-[#12141d]/70 border border-white/10 p-2">
                        <p className="text-[9px] text-gray-500 font-mono uppercase">Demand</p>
                        <p className="text-sm font-bold">{optimisationResult.coverage.requestedStaffHours}h</p>
                      </div>
                      <div className="rounded-xl bg-[#12141d]/70 border border-white/10 p-2">
                        <p className="text-[9px] text-gray-500 font-mono uppercase">Existing</p>
                        <p className="text-sm font-bold">{optimisationResult.coverage.existingCoveredStaffHours}h</p>
                      </div>
                      <div className="rounded-xl bg-[#12141d]/70 border border-white/10 p-2">
                        <p className="text-[9px] text-gray-500 font-mono uppercase">New</p>
                        <p className="text-sm font-bold">{optimisationResult.coverage.newlyGeneratedStaffHours}h</p>
                      </div>
                      <div className="rounded-xl bg-[#12141d]/70 border border-white/10 p-2">
                        <p className="text-[9px] text-gray-500 font-mono uppercase">Unfilled</p>
                        <p className="text-sm font-bold">{optimisationResult.coverage.unfilledStaffHours}h</p>
                      </div>
                    </div>
                  )}

                  {optimisationResult.coverage &&
                    optimisationResult.coverage.requestedStaffHours > 0 &&
                    optimisationResult.coverage.existingCoveredStaffHours >= optimisationResult.coverage.requestedStaffHours &&
                    (optimisationResult.proposedShifts?.length ?? 0) === 0 && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                        This demand is already covered by existing shifts, so no new shift is needed.
                      </div>
                    )}

                  {(optimisationResult.proposedShifts?.length ?? 0) === 0 &&
                    (optimisationResult.coverage?.unfilledStaffHours ?? 0) > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                        No eligible employee matched the current station, availability, and hour limits for the missing demand.
                      </div>
                    )}

                  {/* Proposed shifts — with edit & remove per row */}
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {optimisationResult.proposedShifts?.map((shift, index) => (
                      <div key={`${shift.employeeId}-${shift.startTime}-${index}`} className="rounded-xl bg-[#12141d] border border-white/10 overflow-hidden">
                        <div className="p-3 flex justify-between gap-3 items-start">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{shift.employeeName}</p>
                            <p className="text-xs text-gray-400">{shift.role} &bull; {shift.station}</p>
                          </div>
                          <div className="text-right text-xs font-mono text-gray-300 shrink-0">
                            <p>{formatTime(new Date(shift.startTime))} - {formatTime(new Date(shift.endTime))}</p>
                            <p className="text-gray-500">{shift.breakMinutes} min break</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => setEditingProposedIndex(editingProposedIndex === index ? null : index)}
                              className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 transition-all"
                              title="Edit shift"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            </button>
                            <button
                              onClick={() => handleRemoveProposedShift(index)}
                              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-all"
                              title="Remove shift"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        </div>

                        {/* Inline edit panel */}
                        <AnimatePresence>
                          {editingProposedIndex === index && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-white/5"
                            >
                              <div className="p-3 grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Employee</label>
                                  <select
                                    value={shift.employeeId}
                                    onChange={(e) => {
                                      const emp = employees.find(em => em.id === e.target.value);
                                      if (emp) handleUpdateProposedShift(index, { employeeId: emp.id, employeeName: emp.name, role: emp.role });
                                    }}
                                    className="w-full bg-[#0b0e14] border border-white/10 rounded-lg p-1.5 text-xs outline-none focus:border-blue-500"
                                  >
                                    {employees.map((emp) => (
                                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Station</label>
                                  <select
                                    value={shift.station}
                                    onChange={(e) => handleUpdateProposedShift(index, { station: e.target.value })}
                                    className="w-full bg-[#0b0e14] border border-white/10 rounded-lg p-1.5 text-xs outline-none focus:border-blue-500"
                                  >
                                    {STATIONS.filter(s => s !== "Off Duty").map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  {(optimisationResult.unfilledSlots?.length ?? 0) > 0 && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                      {optimisationResult.unfilledSlots?.length} demand slot(s) could not be filled with the current constraints.
                    </div>
                  )}

                  {(optimisationResult.warnings?.length ?? 0) > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-gray-300">
                      {optimisationResult.warnings?.slice(0, 3).map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setOptimisationResult(null)}
                      className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white"
                    >
                      Revise
                    </button>
                    <button
                      type="button"
                      disabled={optimisationLoading || !optimisationResult.proposedShifts?.length}
                      onClick={handleApproveOptimisation}
                      className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      Approve Schedule
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add / Edit Shift Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#1e2130] border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.6)] flex flex-col"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {editingShiftId !== null ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                  )}
                  <span>{editingShiftId !== null ? "Edit Scheduled Shift" : "Schedule New Shift"}</span>
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <form onSubmit={handleSaveShift} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Assigned Employee</label>
                  <select
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    className="w-full bg-[#12141d] border border-white/10 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Work Station</label>
                  <select
                    value={formStation}
                    onChange={(e) => setFormStation(e.target.value)}
                    className="w-full bg-[#12141d] border border-white/10 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {STATIONS.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Start Time</label>
                    <input
                      type="time" value={formStart} min="07:00" max="21:00"
                      onChange={(e) => setFormStart(e.target.value)}
                      className="w-full bg-[#12141d] border border-white/10 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">End Time</label>
                    <input
                      type="time" value={formEnd} min="07:00" max="21:00"
                      onChange={(e) => setFormEnd(e.target.value)}
                      className="w-full bg-[#12141d] border border-white/10 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  {editingShiftId !== null && (
                    <button
                      type="button"
                      onClick={handleDeleteShift}
                      className="flex-1 bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1 transition-all"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      <span>Delete</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-grow bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded-xl text-sm font-bold transition-all"
                  >
                    {editingShiftId !== null ? "Apply Changes" : "Confirm Schedule"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
