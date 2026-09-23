import { useState, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { useRoadmapItems, useProjects } from '../../hooks/useSupabaseData';
import { Calendar, User, AlertCircle, CheckCircle, Clock, Plus, Edit, Trash2, RefreshCw, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

import { canonicalPriority, canonicalStatus } from '../../lib/roadmapFacets';

type RoadmapItem = Database['public']['Tables']['roadmap_items']['Row'];

interface RoadmapFormData {
  title: string;
  quarter: string;
  status: 'Backlog' | 'In Progress' | 'Complete';
  priority: 'Low' | 'Medium' | 'High';
  owner: string;
  department: string;
  dependencies: string;
  description: string;
}



export default function Roadmap() {
  const { data: roadmapItems, loading: roadmapLoading, error: roadmapError, refetch: refetchRoadmap } = useRoadmapItems();
  const { data: projects, loading: projectsLoading, error: projectsError } = useProjects();
  const [selectedQuarter, setSelectedQuarter] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RoadmapFormData>({
    title: '',
    quarter: '',
    status: 'Backlog',
    priority: 'Medium',
    owner: '',
    department: '',
    dependencies: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = roadmapLoading || projectsLoading;
  const dataError = roadmapError || projectsError;

  const quarters = useMemo(() => ['All', ...Array.from(new Set(roadmapItems.map(item => item.quarter).filter(Boolean) as string[])).sort()], [roadmapItems]);
  const statuses = ['All', 'Backlog', 'In Progress', 'Complete'];
  const departments = useMemo(() => ['All', ...Array.from(new Set(roadmapItems.map(item => item.department).filter(Boolean) as string[]))], [roadmapItems]);

  const filteredItems = useMemo(() => roadmapItems.filter(item => {
    const matchesSearch = searchTerm === '' ||
      (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.owner || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesQuarter = selectedQuarter === 'All' || item.quarter === selectedQuarter;
    const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;
    const matchesDepartment = selectedDepartment === 'All' || item.department === selectedDepartment;

    return matchesSearch && matchesQuarter && matchesStatus && matchesDepartment;
  }), [roadmapItems, searchTerm, selectedQuarter, selectedStatus, selectedDepartment]);

  // Check if roadmap item exists in projects
  const isInProjects = (roadmapTitle: string) => {
    return projects.some(project => 
      project.name.toLowerCase().includes(roadmapTitle.toLowerCase()) ||
      roadmapTitle.toLowerCase().includes(project.name.toLowerCase())
    );
  };

  // Get suggested items to remove (not in projects)
  const itemsToRemove = useMemo(() => roadmapItems.filter(item => {
    const shouldRemove = ['CarePilot Insurance AI', 'Crypto Optimizer Platform', 'OwnBite Food Scanner']
      .some(_name => item.title.includes('Insurance AI Platform') || item.title.includes('Financial Optimizer') || item.title.includes('Health Tech Scanner'));
    return shouldRemove;
  }), [roadmapItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading data: {dataError}</p>
          <p className="text-slate-600">Please make sure you're connected to Supabase.</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Complete':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'In Progress':
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-emerald-100 text-emerald-800';
      case 'In Progress':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-emerald-100 text-emerald-800';
    }
  };

  const handleAddItem = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const dependenciesArray = formData.dependencies
        .split(',')
        .map(dep => dep.trim())
        .filter(dep => dep.length > 0);

      const { error: insertError } = await supabase
        .from('roadmap_items')
        .insert([{
          title: formData.title,
          quarter: formData.quarter,
          status: formData.status,
          priority: formData.priority,
          owner: formData.owner,
          department: formData.department,
          dependencies: dependenciesArray,
          description: formData.description
        }]);

      if (insertError) throw insertError;

      // Reset form
      setFormData({
        title: '',
        quarter: '',
        status: 'Backlog',
        priority: 'Medium',
        owner: '',
        department: '',
        dependencies: '',
        description: ''
      });

      refetchRoadmap();
      setIsAddModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const dependenciesArray = formData.dependencies
        .split(',')
        .map(dep => dep.trim())
        .filter(dep => dep.length > 0);

      const { error: updateError } = await supabase
        .from('roadmap_items')
        .update({
          title: formData.title,
          quarter: formData.quarter,
          status: formData.status,
          priority: formData.priority,
          owner: formData.owner,
          department: formData.department,
          dependencies: dependenciesArray,
          description: formData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedItem.id);

      if (updateError) throw updateError;

      refetchRoadmap();
      setIsEditModalOpen(false);
      setSelectedItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: RoadmapItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.title}"? This action cannot be undone.`)) {
      setDeletingId(item.id);
      try {
        const { error } = await supabase
          .from('roadmap_items')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
        refetchRoadmap();
      } catch (err) {
        console.error('Error deleting roadmap item:', err);
        alert('Failed to delete roadmap item. Please try again.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const openEditModal = (item: RoadmapItem) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      // The column is nullable; a form input must be given a string or React
      // switches it from controlled to uncontrolled mid-edit.
      quarter: item.quarter ?? '',
      status: canonicalStatus(item.status),
      priority: canonicalPriority(item.priority),
      owner: item.owner ?? '',
      department: item.department ?? '',
      dependencies: item.dependencies.join(', '),
      description: item.description ?? ''
    });
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setSelectedQuarter('All');
    setSelectedStatus('All');
    setSelectedDepartment('All');
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900">Technology Roadmap</h1>
          <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">Strategic technology initiatives and their progress across quarters</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetchRoadmap()}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Initiative</span>
          </button>
        </div>
      </div>

      {/* Suggested Cleanup Notice */}
      {itemsToRemove.length > 0 && (
        <motion.div 
          className="bg-amber-50 border border-amber-200 rounded-xl p-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900">Suggested Cleanup</h3>
              <p className="text-sm text-amber-800 mt-1">
                The following roadmap items don't have corresponding active projects and may need to be removed or updated:
              </p>
              <ul className="mt-2 space-y-1">
                {itemsToRemove.map(item => (
                  <li key={item.id} className="text-sm text-amber-800 flex items-center justify-between">
                    <span>• {item.title}</span>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="ml-2 text-amber-600 hover:text-amber-800 text-xs underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
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

          {/* Filter Dropdowns */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
            >
              <option value="All">All Quarters</option>
              {quarters.map(quarter => (
                <option key={quarter} value={quarter}>{quarter === 'All' ? 'All Quarters' : quarter}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statuses.map(status => (
                <option key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
              ))}
            </select>
            {(selectedQuarter !== 'All' || selectedStatus !== 'All' || selectedDepartment !== 'All' || searchTerm) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Roadmap Items */}
      <div className="space-y-6">
        {filteredItems.map((item) => (
          <motion.div 
            key={item.id} 
            className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  {getStatusIcon(item.status)}
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900">{item.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                    {item.priority} Priority
                  </span>
                  {isInProjects(item.title) && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                      Active Project
                    </span>
                  )}
                </div>
                
                <p className="text-slate-600 mb-4">{item.description}</p>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-700">{item.quarter}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-700">{item.owner}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500">Department:</span>
                    <span className="text-slate-700">{item.department}</span>
                  </div>
                </div>

                {item.dependencies.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Dependencies:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.dependencies.map((dep, index) => (
                        <span key={index} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm">
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
                <button
                  onClick={() => openEditModal(item)}
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit initiative"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item)}
                  disabled={deletingId === item.id}
                  className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete initiative"
                >
                  {deletingId === item.id ? (
                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No roadmap items match the selected filters.</p>
            <button
              onClick={clearFilters}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear all filters to see all items
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="cos-modal bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {isAddModalOpen ? 'Add New Initiative' : 'Edit Initiative'}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedItem(null);
                  setError(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Initiative Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="e.g., MPB Health APP Suite"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quarter *
                  </label>
                  <select
                    name="quarter"
                    required
                    value={formData.quarter}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                  >
                    <option value="">Select Quarter</option>
                    <option value="Q1 2025">Q1 2025</option>
                    <option value="Q2 2025">Q2 2025</option>
                    <option value="Q3 2025">Q3 2025</option>
                    <option value="Q4 2025">Q4 2025</option>
                    <option value="Q1 2026">Q1 2026</option>
                    <option value="Q2 2026">Q2 2026</option>
                    <option value="Ongoing">Ongoing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status *
                  </label>
                  <select
                    name="status"
                    required
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                  >
                    <option value="Backlog">Backlog</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Priority *
                  </label>
                  <select
                    name="priority"
                    required
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Owner *
                  </label>
                  <input
                    type="text"
                    name="owner"
                    required
                    value={formData.owner}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="e.g., Development Team"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    name="department"
                    required
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="e.g., Product Engineering"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Dependencies
                  </label>
                  <input
                    type="text"
                    name="dependencies"
                    value={formData.dependencies}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="Enter dependencies separated by commas"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Separate multiple dependencies with commas
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="Detailed description of the initiative"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    setSelectedItem(null);
                    setError(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={isAddModalOpen ? handleAddItem : handleEditItem}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isSubmitting ? (isAddModalOpen ? 'Adding...' : 'Updating...') : (isAddModalOpen ? 'Add Initiative' : 'Update Initiative')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}