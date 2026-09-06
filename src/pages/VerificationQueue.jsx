import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import { MOCK_VERIFICATION_QUEUE } from '../data/mockData';
import { Filter, UserPlus, CheckSquare, Search, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VerificationQueue() {
  const navigate = useNavigate();
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedState, setAssignedState] = useState({});

  const filteredQueue = MOCK_VERIFICATION_QUEUE.filter((item) => {
    if (priorityFilter !== 'All' && item.priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;
    if (statusFilter !== 'All' && item.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.id.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.issue.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAssignOfficer = (id, e) => {
    e.stopPropagation();
    setAssignedState(prev => ({
      ...prev,
      [id]: prev[id] === 'Officer M. Rao' ? 'Unassigned' : 'Officer M. Rao'
    }));
  };

  const columns = [
    {
      header: 'Submission ID',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-900">{row.id}</span>
          <span className="text-[10px] text-slate-500 font-mono">({row.type})</span>
        </div>
      )
    },
    {
      header: 'Issue Flag',
      accessor: 'issue',
      cell: (row) => <span className="font-medium text-slate-800">{row.issue}</span>
    },
    {
      header: 'District / Zone',
      accessor: 'location',
      cell: (row) => <span className="text-slate-600">{row.location} • {row.subbasin}</span>
    },
    {
      header: 'Priority',
      accessor: 'priority',
      cell: (row) => <StatusBadge status={row.priority} text={row.priority} />
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status} text={row.status} />
    },
    {
      header: 'Assigned Officer',
      accessor: 'assignedOfficer',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700">
          {assignedState[row.id] || row.assignedOfficer}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => handleAssignOfficer(row.id, e)}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-semibold border border-slate-300 flex items-center space-x-1"
          >
            <UserPlus className="w-3 h-3 text-slate-600" />
            <span>{assignedState[row.id] === 'Officer M. Rao' ? 'Reassign' : 'Assign'}</span>
          </button>
          <button
            onClick={() => navigate('/submissions')}
            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center space-x-1"
          >
            <span>Audit</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Verification Queue"
        subtitle="Priority triage table for flagged geospatial anomalies and field submissions"
        actions={
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded">
              {filteredQueue.length} Items Pending Action
            </span>
          </div>
        }
      />

      {/* Filter & Search Controls */}
      <div className="p-4 bg-white border border-slate-200 rounded-sm shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter by ID, district, or issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full md:w-80"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold text-slate-800 focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold text-slate-800 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Pending Triage">Pending Triage</option>
              <option value="In Review">In Review</option>
              <option value="Verified">Verified</option>
              <option value="Flagged">Flagged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredQueue}
        onRowClick={() => navigate('/submissions')}
      />
    </div>
  );
}
