'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from "next/navigation";
import { api, ApiShift } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import Link from 'next/link';


interface DashboardEmployee {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: "Active" | "Off Duty";
  station: string;
}

interface ShiftRecord {
  name: string;
  duration: number;
}

interface CalendarDay {
  day: number;
  status: "optimised" | "unoptimised" | null;
  shifts: ShiftRecord[];
}

export default function Home() {
  const router = useRouter();
  const [employees, setEmployees] = useState<DashboardEmployee[]>([]);
  const [shifts, setShifts] = useState<ApiShift[]>([]);
  const [selectedDate, setSelectedDate] = useState<CalendarDay | null>(null);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace('/');
    }
  }, [router]);

  const chartData = useMemo(() => {
    const grouped = shifts.reduce<
      Record<string, { name: string; optimised: number; unoptimised: number }>
    >((acc, shift) => {
      const month = new Date(shift.startTime).toLocaleString("en-US", {
        month: "short",
      });

      if (!acc[month]) {
        acc[month] = {
          name: month,
          optimised: 0,
          unoptimised: 0,
        };
      }

      if (shift.isOptimised) {
        acc[month].optimised += 1;
      } else {
        acc[month].unoptimised += 1;
      }

      return acc;
    }, {});

    return Object.values(grouped);
  }, [shifts]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setDashboardError("");
        const [employeeData, shiftData] = await Promise.all([
          api.listEmployees(),
          api.listShifts(),
        ]);

        setShifts(shiftData.shifts);

        setEmployees(
          employeeData.employees.map((employee) => {
            const todayShift = shiftData.shifts.find((shift) => {
              return (
                shift.employeeId === employee.id &&
                isToday(new Date(shift.startTime))
              );
            });

            return {
              id: employee.id,
              name: employee.name,
              role: employee.role,
              initials: getInitials(employee.name),
              status: todayShift ? "Active" : "Off Duty",
              station: todayShift?.station ?? "No Shift",
            };
          })
        );
      } catch (err) {
        setDashboardError(err instanceof Error ? err.message : "FAILED_TO_LOAD_DASHBOARD");
      }
    }

    loadDashboardData();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getShiftDuration = (shift: ApiShift) => {
    const start = new Date(shift.startTime).getTime();
    const end = new Date(shift.endTime).getTime();

    return Math.max(0, (end - start) / (1000 * 60 * 60));
  };

  const isToday = (date: Date) => {
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const calendarData = useMemo(() => {
    const employeeNameById = new Map(
      employees.map((employee) => [employee.id, employee.name])
    );

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;

      const dayShifts = shifts.filter((shift) => {
        const shiftDate = new Date(shift.startTime);

        return (
          shiftDate.getFullYear() === year &&
          shiftDate.getMonth() === month &&
          shiftDate.getDate() === day
        );
      });

      const hasUnoptimised = dayShifts.some((shift) => !shift.isOptimised);

      const status =
        dayShifts.length === 0
          ? null
          : hasUnoptimised
            ? "unoptimised"
            : "optimised";

      return {
        day,
        status,
        shifts: dayShifts.map((shift) => ({
          name: employeeNameById.get(shift.employeeId) ?? "Unknown Employee",
          duration: getShiftDuration(shift),
        })),
      };
    });
  }, [shifts, employees]);

  return (
    <div className="h-screen w-screen bg-[#0b0e14] text-white p-6 font-sans flex flex-col overflow-hidden">
      <main className="max-w-[1440px] w-full h-full mx-auto flex flex-col gap-8 overflow-hidden min-h-0">
        
        <header className="flex justify-between items-center bg-[#1e2130]/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
          <h1 className="text-xl font-bold bg-white bg-clip-text text-transparent">Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white group-hover:ring-2 group-hover:ring-blue-400 transition-all">
                AD
              </div>
              <span className="font-mono text-sm text-gray-400 group-hover:text-white transition-colors">ADMIN</span>
            </Link>
          </div>
        </header>

        {dashboardError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm">
            Dashboard failed to load: {dashboardError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-[4] min-h-0">
          <motion.section 
            whileHover={{ scale: 1.01 }}
            className="md:col-span-1 bg-gradient-to-b from-[#1e2130] to-[#12141d] p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col justify-between"
          >
            <div>
              <h1 className="text-3xl font-black">Welcome to Admin Dashboard</h1>
              <p className="text-blue-400 mt-1 font-mono text-xs">SYSTEM_STATUS: OPTIMAL</p>
            </div>
            <div>
              <div className="text-5xl font-bold tracking-tighter">32°C</div>
              <p className="text-gray-500 text-xs mt-1">Facility Temperature</p>
            </div>
          </motion.section>

          {/* Removed overflow-hidden here to allow tooltips to break out of the section */}
          <section className="md:col-span-2 bg-[#12141d] p-6 rounded-3xl border border-white/5 flex flex-col justify-between relative">
            <h3 className="text-md font-bold flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <a href="/schedule" className="hover:text-green-400 hover:underline transition-all">
                SHIFT TRACKER
              </a>
            </h3>
            
            <div className="w-full flex flex-col justify-center flex-grow min-h-0 mt-2">
              <div className="grid grid-cols-7 gap-2 text-center mb-2 shrink-0">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayLabel) => (
                  <span key={dayLabel} className="text-xs font-mono text-gray-500 font-bold uppercase tracking-wider">
                    {dayLabel}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 flex-grow min-h-0">
                {calendarData.map((item) => (
                  <div key={item.day} className="relative group w-full h-full min-h-[32px] max-h-[46px]">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      className={`rounded-xl flex items-center justify-center font-bold text-xs transition-all w-full h-full ${
                        item.status === 'optimised' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 
                        item.status === 'unoptimised' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 
                        'bg-[#1e2130]'
                      }`}
                    >
                      {item.day}
                    </motion.button>
                    
                    {/* Tooltip Popup */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-[#1e2130] border border-white/10 rounded-xl p-3 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none scale-95 group-hover:scale-100 origin-bottom flex flex-col gap-1">
                      <div className="text-[10px] font-mono text-gray-400 mb-1 uppercase border-b border-white/10 pb-1 flex justify-between">
                        <span>Day {item.day}</span>
                        <span>{item.shifts.length} Shifts</span>
                      </div>
                      
                      {item.shifts.length > 0 ? (
                        item.shifts.map((shift, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-white truncate pr-2 font-medium">{shift.name}</span>
                            <span className="text-blue-400 font-mono font-bold shrink-0">{shift.duration}h</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-500 text-center py-1">No Shifts Logged</div>
                      )}
                      
                      {/* Tooltip Downward Triangle */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#1e2130]"></div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-[5] min-h-0">
          <section className="md:col-span-2 bg-[#1e2130] p-6 rounded-3xl border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden hover:bg-[#1e2130]/90 transition-colors">
            <h3 className="text-sm font-bold text-blue-400 font-mono tracking-widest shrink-0">PERFORMANCE</h3>
            <div className="flex-1 min-h-0 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ bottom: 0, top: 10 }}>
                  <XAxis dataKey="name" stroke="#ffffff" fontSize={11} tickLine={false} />
                  <Tooltip 
                    cursor={false}
                    contentStyle={{ 
                      backgroundColor: '#1e2130', 
                      border: '#1e2130',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="optimised" fill="#2d82ff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unoptimised" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="md:col-span-1 bg-[#1e2130] p-6 rounded-3xl border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
            <h3 className="text-sm font-bold text-green-400 font-mono tracking-widest flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <Link href="/member" className="hover:text-green-300 hover:underline transition-all">
                ROSTER
              </Link>
            </h3>
            
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-3 pr-1">
              {employees.map((emp) => (
                <Link key={emp.id} href={`/employeeshift?employeeId=${emp.id}`}>
                  <motion.div
                    whileHover={{ x: 2 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#12141d]/60 border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500/20 to-purple-500/20 flex items-center justify-center font-bold text-xs text-blue-300 border border-blue-500/10 shrink-0">
                        {emp.initials}
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-xs truncate">{emp.name}</h4>
                        <p className="text-[10px] text-gray-500 truncate">{emp.role}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">
                        {emp.station}
                      </span>

                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          emp.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {selectedDate && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-[#1e2130] border border-blue-500/30 p-6 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(59,130,246,0.2)]"
            >
              <h2 className="text-xl font-black uppercase tracking-tighter">Shift Log: Day {selectedDate.day}</h2>
              <div className="h-1 w-20 bg-blue-500 my-3"></div>
              <p className="text-sm text-gray-400 mb-6 font-mono">{selectedDate.status ? `STATUS: ${selectedDate.status.toUpperCase()}` : "NO DATA"}</p>
              <button 
                onClick={() => setSelectedDate(null)} 
                className="w-full bg-white text-black py-2.5 rounded-xl font-bold uppercase hover:bg-blue-400 transition-colors text-sm"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
