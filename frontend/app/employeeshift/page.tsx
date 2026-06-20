import React from 'react';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EmployeeShiftPage({ searchParams }: PageProps) {

  const resolvedParams = await searchParams;
  const employeeId = resolvedParams.employeeId as string | undefined;
  

  return (
    <div className="min-h-screen bg-[#0d0e1b] text-slate-100 p-6 md:p-10">
      <div className="border-b border-slate-800 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Shift Calendar</h1>
        <p className="text-xs text-slate-400 mt-1">
          {employeeId 
            ? `Filtering schedule details for Employee ID: ${employeeId}` 
            : "Viewing all master schedules"}
        </p>
      </div>

      {/* Tell your friend to paste their Calendar layout / Chart component code right here! */}
      <div className="bg-[#121324] border border-dashed border-slate-800 rounded-2xl h-96 flex items-center justify-center text-slate-500 text-sm">
        [ Friend's Calendar / Scheduler Component Placeholder ]
      </div>
    </div>
  );
}