'use client';

import React, { useState } from 'react';


interface Member {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  initials: string;
  status: 'Active' | 'Inactive';
  colorClass: string;
}

const MembersSection: React.FC = () => {
  const [members] = useState<Member[]>([
    { id: '1', name: 'Jen Sen', role: 'Admin', initials: 'JS', status: 'Active', colorClass: 'bg-rose-500' },
    { id: '2', name: 'Wei Ming', role: 'Full Access', initials: 'WM', status: 'Active', colorClass: 'bg-teal-500' },
    { id: '3', name: 'Jun Han', role: 'Full Access', initials: 'JH', status: 'Active', colorClass: 'bg-indigo-500' },
    { id: '4', name: 'Kit Qi', role: 'Full Access', initials: 'KQ', status: 'Active', colorClass: 'bg-amber-500' },
    { id: '5', name: 'Wayne Ong', role: 'Full Access', initials: 'WO', status: 'Active', colorClass: 'bg-orange-500' },
  ]);

  return (
    <div className="min-h-screen bg-[#0d0e1b] text-slate-100 p-6 md:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Team Members</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your organization's employees, access permissions, and roles.
          </p>
        </div>
        <button 
          type="button" 
          className="inline-flex bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </button>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#121324] border border-slate-800/60 p-4 rounded-xl">
          <p className="text-xs text-center font-medium text-slate-400 uppercase tracking-wider">Total Members</p>
          <p className="text-center text-8xl font-bold text-white mt-1 p-12">{members.length}</p>
        </div>
        <div className="bg-[#121324] border border-slate-800/60 p-4 rounded-xl">
          <p className="text-xs text-center font-medium text-slate-400 uppercase tracking-wider">Active Shifts Today</p>
          <p className="text-center text-8xl font-bold text-emerald-400 mt-1 p-12">3</p>
        </div>
        <div className="bg-[#121324] border border-slate-800/60 p-4 rounded-xl">
          <p className="text-xs text-center font-medium text-slate-400 uppercase tracking-wider">Pending Invites</p>
          <p className="text-center text-8xl font-bold text-slate-400 mt-1 p-12">0</p>
        </div>
      </div>

      {/* Members Grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {members.map((member) => (
          <div 
            key={member.id} 
            className="bg-[#121324] border border-slate-800/50 hover:border-slate-700/80 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-200 group relative overflow-hidden"
          >

            <span className="absolute top-4 right-4 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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

            {/* Actions Quick-menu simulation */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 w-full flex justify-center gap-4 text-xs font-medium text-slate-400">
              <button className="hover:text-white transition-colors">View Shifts</button>
              <span className="text-slate-700">|</span>
              <button className="hover:text-rose-400 transition-colors">Edit</button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default MembersSection;