'use client';

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { api, Employee, ApiShift } from "@/lib/api";


interface Member {
  id: string;
  name: string;
  role: string;
  initials: string;
  hourlywages: number;
  status: "Active" | "Inactive";
  colorClass: string;
  totalHours: number;
}

interface MemberForm {
  name: string;
  role: string;
  hourlyWage: string;
}

const colorClasses = [
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-blue-500",
];

const colorHexMap: Record<string, string> = {
  "bg-rose-500":   "#f43f5e",
  "bg-teal-500":   "#14b8a6",
  "bg-indigo-500": "#6366f1",
  "bg-amber-500":  "#f59e0b",
  "bg-orange-500": "#f97316",
  "bg-blue-500":   "#3b82f6",
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const isToday = (date: Date) => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const calcTotalHours = (employeeId: string, shifts: ApiShift[]): number => {
  return shifts
    .filter((s) => s.employeeId === employeeId)
    .reduce((acc, s) => {
      const ms = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
      return acc + ms / 3_600_000;
    }, 0);
};

const employeeToMember = (
  employee: Employee,
  index: number,
  shifts: ApiShift[]
): Member => {
  const hasShiftToday = shifts.some((shift) => {
    return shift.employeeId === employee.id && isToday(new Date(shift.startTime));
  });

  return {
    id: employee.id,
    name: employee.name,
    role: employee.role,
    initials: getInitials(employee.name),
    hourlywages: employee.hourlyWage,
    status: hasShiftToday ? "Active" : "Inactive",
    colorClass: colorClasses[index % colorClasses.length],
    totalHours: calcTotalHours(employee.id, shifts),
  };
};

// ─── Leaderboard sub-component ───────────────────────────────────────────────
const HoursLeaderboard: React.FC<{ members: Member[] }> = ({ members }) => {
  const ranked = [...members]
    .filter((m) => m.totalHours > 0)
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 3);

  const medals = ["🥇", "🥈", "🥉"];
  const medalGlows: React.CSSProperties[] = [
    { boxShadow: "0 0 12px rgba(250,204,21,0.4)", border: "1px solid rgba(250,204,21,0.3)" },
    { boxShadow: "0 0 10px rgba(148,163,184,0.3)", border: "1px solid rgba(148,163,184,0.25)" },
    { boxShadow: "0 0 10px rgba(180,83,9,0.3)",   border: "1px solid rgba(180,83,9,0.25)" },
  ];

  if (ranked.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "16px" }}>
        No shift data yet
      </div>
    );
  }

  // Bar widths relative to top scorer
  const maxHours = ranked[0]?.totalHours ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
      {ranked.map((m, i) => {
        const barPct = (m.totalHours / maxHours) * 100;
        const hex = colorHexMap[m.colorClass] ?? "#6366f1";
        return (
          <div key={m.id} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "8px 10px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "10px",
            ...medalGlows[i],
            position: "relative", overflow: "hidden",
          }}>
            {/* Progress bar background */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${barPct}%`,
              background: `${hex}14`,
              transition: "width 0.6s ease",
              pointerEvents: "none",
            }} />

            <span style={{ fontSize: "18px", zIndex: 1 }}>{medals[i]}</span>

            <div style={{
              width: "30px", height: "30px", borderRadius: "50%",
              background: hex, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "11px", fontWeight: "700",
              color: "#fff", flexShrink: 0, zIndex: 1,
            }}>
              {m.initials}
            </div>

            <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
              <p style={{
                fontSize: "13px", fontWeight: "600", color: "#fff",
                margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{m.name}</p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0 }}>{m.role}</p>
            </div>

            <span style={{
              fontSize: "13px", fontWeight: "700", color: hex,
              flexShrink: 0, zIndex: 1,
            }}>
              {m.totalHours.toFixed(1)}h
            </span>
          </div>
        );
      })}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const MembersSection: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [shifts, setShifts] = useState<ApiShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [formData, setFormData] = useState<MemberForm>({
    name: "",
    role: "",
    hourlyWage: "",
  });

  const activeShiftsToday = shifts.filter((shift) =>
    isToday(new Date(shift.startTime))
  ).length;

  const loadMembers = async () => {
    try {
      setError("");
      setLoading(true);

      const [employeeData, shiftData] = await Promise.all([
        api.listEmployees(),
        api.listShifts(),
      ]);

      setShifts(shiftData.shifts);

      setMembers(
        employeeData.employees.map((employee, index) =>
          employeeToMember(employee, index, shiftData.shifts)
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED_TO_LOAD_EMPLOYEES");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);
  
  const handleOpenAddMember = () => {
    setEditingMember(null);
    setIsAddingMember(true);
    setFormData({
      name: "",
      role: "",
      hourlyWage: "",
    });
  };

  const handleOpenEditMember = (member: Member) => {
    setEditingMember(member);
    setIsAddingMember(false);
    setFormData({
      name: member.name,
      role: member.role,
      hourlyWage: String(member.hourlywages),
    });
  };

  const handleSaveMember = async () => {
    const hourlyWage = Number(formData.hourlyWage);

    if (!formData.name || !formData.role || Number.isNaN(hourlyWage)) {
      setError("Please fill in all employee fields correctly.");
      return;
    }

    if (isAddingMember) {
      await api.createEmployee({
        name: formData.name,
        role: formData.role,
        hourlyWage,
      });
    } else if (editingMember) {
      await api.updateEmployee(editingMember.id, {
        name: formData.name,
        role: formData.role,
        hourlyWage,
      });
    }

    setEditingMember(null);
    setIsAddingMember(false);
    await loadMembers();
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    await api.deleteEmployee(id);
    setEditingMember(null);
    await loadMembers();
  };

  return (
    <div className="min-h-screen bg-[#0d0e1b] text-slate-100 p-6 md:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">MEET THE TEAM</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage your organization&apos;s employees, access permissions, and roles.
            </p>
          </div>
        </div>
        <button 
          type="button" 
          className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline transition-colors"
          onClick={handleOpenAddMember}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total Members */}
        <div className="bg-[#121324] border border-slate-800/60 p-4 rounded-xl">
          <p className="text-xs text-center font-medium text-slate-400 uppercase tracking-wider">Total Members</p>
          <p className="text-center text-8xl font-bold text-white mt-1 p-12">{members.length}</p>
        </div>

        {/* Active Shifts Today */}
        <div className="bg-[#121324] border border-slate-800/60 p-4 rounded-xl">
          <p className="text-xs text-center font-medium text-slate-400 uppercase tracking-wider">Active Shifts Today</p>
          <p className="text-center text-8xl font-bold text-emerald-400 mt-1 p-12">{activeShiftsToday}</p>
        </div>

        {/* Hours Leaderboard — replaces Pending Invites */}
        <div className="bg-[#121324] border border-slate-800/60 p-5 rounded-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Hours Leaderboard</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 tracking-wide">
              ALL TIME
            </span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <svg className="animate-spin h-6 w-6 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
          ) : (
            <HoursLeaderboard members={members} />
          )}
        </div>
      </div>


      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#121324] border border-slate-800/50 rounded-2xl p-6 flex flex-col items-center animate-pulse">
              <div className="w-20 h-20 rounded-full bg-slate-800 mb-4" />
              <div className="h-4 w-28 bg-slate-800 rounded mb-2" />
              <div className="h-3 w-20 bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Member cards grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {members.map((member) => (
            <div 
              key={member.id} 
              className="bg-[#121324] border border-slate-800/50 hover:border-slate-700/80 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-200 group relative overflow-hidden"
            >
              {/* Status dot */}
              <span className="absolute top-4 right-4 flex h-2 w-2">
                {member.status === "Active" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-600"></span>
                )}
              </span>

              <div className={`w-20 h-20 rounded-full ${member.colorClass} flex items-center justify-center text-white font-bold text-xl shadow-inner mb-4 tracking-wider ring-4 ring-slate-900`}>
                {member.initials}
              </div>
              <h3 className="font-semibold text-lg text-white group-hover:text-blue-400 transition-colors">
                {member.name}
              </h3>
              <p className="text-xs font-medium text-slate-400 mt-1 bg-slate-800/40 px-3 py-1 rounded-full border border-slate-800">
                {member.role}
              </p>

              {/* Hours badge */}
              {member.totalHours > 0 && (
                <p className="text-xs font-semibold text-indigo-400 mt-2">
                  {member.totalHours.toFixed(1)}h total
                </p>
              )}

              <div className="mt-6 pt-4 border-t border-slate-800/80 w-full flex justify-center gap-4 text-xs font-medium text-slate-400">
                <Link 
                  href={`/employeeshift?employeeId=${member.id}`}
                  className="text-slate-400 hover:text-white transition-colors font-medium cursor-pointer"
                >
                  View Shifts
                </Link>
                
                <span className="text-slate-700">|</span>
                <button 
                  onClick={() => handleOpenEditMember(member)} 
                  className="hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add modal */}
      {(editingMember || isAddingMember) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-[#121324] border border-slate-800 w-full max-w-md p-6 rounded-2xl text-slate-100 shadow-2xl">
            
            <h2 className="text-xl font-bold text-white mb-4">{isAddingMember ? "Add New Employee" : "Edit Profile"} </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#0d0e1b] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-[#0d0e1b] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Hourly Wages</label>
                <input
                  type="number"
                  value={formData.hourlyWage}
                  onChange={(e) => setFormData({ ...formData, hourlyWage: e.target.value })}
                  className="w-full bg-[#0d0e1b] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800/60">
              <button
                onClick={() => { setEditingMember(null); setIsAddingMember(false); }}
                className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                Cancel
              </button>
              {editingMember && (
                <button 
                  type="button"
                  onClick={() => handleDeleteMember(editingMember.id)} 
                  className="bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                  <span>Delete</span>
                </button>
              )}
              <button 
                onClick={handleSaveMember} 
                className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl text-white font-semibold cursor-pointer transition-colors"
              >
                Save
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default MembersSection;