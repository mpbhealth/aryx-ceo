import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRoadmapItems } from '../../hooks/useSupabaseData';
import { canonicalPriority, canonicalStatus, type RoadmapPriority } from '../../lib/roadmapFacets';
import type { Database } from '../../types/database';
import { 
  Calendar, 
  User, 
  Building, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Filter,
  X,
  Search,
  Download,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

type RoadmapItem = Database['public']['Tables']['roadmap_items']['Row'];

const priorityColors = {
  High: 'bg-red-500',
  Medium: 'bg-yellow-400',
  Low: 'bg-green-400',
};

const statusStyles = {
  'In Progress': 'ring-2 ring-blue-500',
  'Backlog': 'ring-2 ring-gray-300',
  'Complete': 'ring-2 ring-emerald-500',
};

const statusIcons = {
  'In Progress': Clock,
  'Backlog': AlertCircle,
  'Complete': CheckCircle,
};

export default function RoadVisualizerWithFilters() {
  const { data: roadmapItems, loading, error, refetch } = useRoadmapItems();
  const [selectedView, setSelectedView] = useState('quarter');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    department: 'All',
    status: 'All',
    priority: 'All',
    quarter: 'All',
    owner: 'All'
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading roadmap data: {error}</p>
          <p className="text-slate-600">Please make sure you're connected to Supabase.</p>
        </div>
      </div>
    );
  }

  // Get unique values for filter options
  // quarter, department and owner are all nullable columns; a null would otherwise
  // reach <option value> and React would render it as the string "null".
  const quarters = ['All', ...Array.from(new Set(roadmapItems.map(item => item.quarter).filter(Boolean) as string[])).sort()];
  const departments = ['All', ...Array.from(new Set(roadmapItems.map(item => item.department).filter(Boolean) as string[]))];
  const statuses = ['All', 'Backlog', 'In Progress', 'Complete'];
  const priorities = ['All', 'High', 'Medium', 'Low'];
  const owners = ['All', ...Array.from(new Set(roadmapItems.map(item => item.owner).filter(Boolean) as string[]))];

  // Apply all filters
  const applyFilters = (item: RoadmapItem) => {
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.owner || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = filters.department === 'All' || item.department === filters.department;
    const matchesStatus = filters.status === 'All' || item.status === filters.status;
    const matchesPriority = filters.priority === 'All' || item.priority === filters.priority;
    const matchesQuarter = filters.quarter === 'All' || item.quarter === filters.quarter;
    const matchesOwner = filters.owner === 'All' || item.owner === filters.owner;

    return matchesSearch && matchesDepartment && matchesStatus && matchesPriority && matchesQuarter && matchesOwner;
  };

  const filteredItems = roadmapItems.filter(applyFilters);

  const clearAllFilters = () => {
    setFilters({
      department: 'All',
      status: 'All',
      priority: 'All',
      quarter: 'All',
      owner: 'All'
    });
    setSearchTerm('');
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== 'All').length + (searchTerm ? 1 : 0);
  };

  const getStatusIcon = (status: RoadmapItem['status']) => {
    const Icon = statusIcons[canonicalStatus(status)] || AlertCircle;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Roadmap Visualizer</h1>
          <p className="text-slate-600 mt-2">Interactive timeline view of strategic technology initiatives</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {showFilters ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            {getActiveFilterCount() > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {getActiveFilterCount()}
              </span>
            )}
          </button>
          
          <button
            onClick={refetch}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <motion.div 
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Advanced Filters</h3>
            <div className="flex items-center space-x-2">
              {getActiveFilterCount() > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search roadmap items..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quarter</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                value={filters.quarter}
                onChange={(e) => setFilters({ ...filters, quarter: e.target.value })}
              >
                {quarters.map((quarter) => (
                  <option key={quarter} value={quarter}>{quarter}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Owner</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                value={filters.owner}
                onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
              >
                {owners.map((owner) => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {getActiveFilterCount() > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-sm font-medium text-slate-700">Active filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                    Search: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-1 text-indigo-600 hover:text-indigo-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {Object.entries(filters).map(([key, value]) => 
                  value !== 'All' && (
                    <span key={key} className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                      {key}: {value}
                      <button
                        onClick={() => setFilters({ ...filters, [key]: 'All' })}
                        className="ml-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* View Mode Selector */}
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-slate-700">View:</span>
        {[
          { value: 'quarter', label: 'By Quarter' },
          { value: 'department', label: 'By Department' },
          { value: 'status', label: 'By Status' },
          { value: 'priority', label: 'By Priority' }
        ].map((view) => (
          <button
            key={view.value}
            onClick={() => setSelectedView(view.value)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              selectedView === view.value
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Filtered Items</p>
              <p className="text-2xl font-bold text-slate-900">{filteredItems.length}</p>
              <p className="text-xs text-slate-500">of {roadmapItems.length} total</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">In Progress</p>
              <p className="text-2xl font-bold text-slate-900">
                {filteredItems.filter(item => item.status === 'In Progress').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Complete</p>
              <p className="text-2xl font-bold text-slate-900">
                {filteredItems.filter(item => item.status === 'Complete').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">High Priority</p>
              <p className="text-2xl font-bold text-slate-900">
                {filteredItems.filter(item => item.priority === 'High').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {selectedView === 'quarter' && (
              <div className="grid grid-cols-4 gap-6">
                {quarters.filter(q => q !== 'All').map((quarter) => {
                  const quarterItems = filteredItems.filter(item => item.quarter === quarter);
                  return (
                    <div key={quarter} className="space-y-4">
                      <div className="flex items-center space-x-2 pb-4 border-b border-slate-200">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-semibold text-slate-900">{quarter}</h2>
                        <span className="text-sm text-slate-600">({quarterItems.length})</span>
                      </div>
                      <div className="space-y-3">
                        {quarterItems.map((item) => (
                          <motion.div
                            key={item.id}
                            layout
                            className={`
                              p-4 rounded-xl shadow-sm border-2 text-white cursor-pointer
                              hover:shadow-md transition-all duration-200
                              ${priorityColors[canonicalPriority(item.priority)]} 
                              ${statusStyles[canonicalStatus(item.status)]}
                            `}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-sm font-bold leading-tight">{item.title}</div>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(item.status)}
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  item.priority === 'High' ? 'bg-red-600' :
                                  item.priority === 'Medium' ? 'bg-yellow-600' : 'bg-green-600'
                                }`}>
                                  {item.priority}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-xs opacity-90 mb-2">
                              <Building className="w-3 h-3" />
                              <span>{item.department}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-xs opacity-80">
                              <User className="w-3 h-3" />
                              <span>{item.owner}</span>
                            </div>
                            
                            {item.dependencies && item.dependencies.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-white/20">
                                <div className="text-xs opacity-75">
                                  Dependencies: {item.dependencies.length}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedView === 'department' && (
              <div className="space-y-6">
                {Array.from(new Set(filteredItems.map(item => item.department))).map((department) => {
                  const deptItems = filteredItems.filter(item => item.department === department);
                  return (
                    <div key={department} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <Building className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-slate-900">{department}</h3>
                        <span className="text-sm text-slate-600">({deptItems.length} items)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deptItems.map((item) => (
                          <motion.div
                            key={item.id}
                            className={`
                              p-4 rounded-lg shadow-sm border text-white
                              ${priorityColors[canonicalPriority(item.priority)]} 
                              ${statusStyles[canonicalStatus(item.status)]}
                            `}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="text-sm font-bold mb-2">{item.title}</div>
                            <div className="flex items-center justify-between text-xs opacity-90">
                              <span>{item.quarter}</span>
                              <span>{item.status}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedView === 'status' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Backlog', 'In Progress', 'Complete'].map((status) => {
                  const statusItems = filteredItems.filter(item => item.status === status);
                  return (
                    <div key={status} className="space-y-4">
                      <div className="flex items-center space-x-2 pb-4 border-b border-slate-200">
                        {getStatusIcon(status as RoadmapItem['status'])}
                        <h2 className="text-lg font-semibold text-slate-900">{status}</h2>
                        <span className="text-sm text-slate-600">({statusItems.length})</span>
                      </div>
                      <div className="space-y-3">
                        {statusItems.map((item) => (
                          <motion.div
                            key={item.id}
                            className={`
                              p-4 rounded-lg shadow-sm border text-white
                              ${priorityColors[canonicalPriority(item.priority)]}
                            `}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="text-sm font-bold mb-2">{item.title}</div>
                            <div className="text-xs opacity-90 mb-1">{item.department}</div>
                            <div className="text-xs opacity-80">{item.quarter} • {item.owner}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedView === 'priority' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['High', 'Medium', 'Low'].map((priority) => {
                  const priorityItems = filteredItems.filter(item => item.priority === priority);
                  return (
                    <div key={priority} className="space-y-4">
                      <div className="flex items-center space-x-2 pb-4 border-b border-slate-200">
                        <div className={`w-4 h-4 rounded-full ${priorityColors[priority as RoadmapPriority]}`}></div>
                        <h2 className="text-lg font-semibold text-slate-900">{priority} Priority</h2>
                        <span className="text-sm text-slate-600">({priorityItems.length})</span>
                      </div>
                      <div className="space-y-3">
                        {priorityItems.map((item) => (
                          <motion.div
                            key={item.id}
                            className={`
                              p-4 rounded-lg shadow-sm border text-white
                              ${priorityColors[canonicalPriority(item.priority)]}
                              ${statusStyles[canonicalStatus(item.status)]}
                            `}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="text-sm font-bold mb-2">{item.title}</div>
                            <div className="text-xs opacity-90 mb-1">{item.department}</div>
                            <div className="text-xs opacity-80">{item.quarter} • {item.status}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">No roadmap items match the selected filters.</p>
          <button
            onClick={clearAllFilters}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear all filters to see all items
          </button>
        </div>
      )}
    </div>
  );
}