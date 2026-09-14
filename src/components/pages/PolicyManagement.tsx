import { useState } from 'react';
import { downloadFile } from '@/utils/downloadFile';
import { motion } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  Calendar,
  Tag,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  X,
  Eye,
  Building2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePolicyDocuments } from '../../hooks/useOrganizationalData';
import { useDepartments } from '../../hooks/useOrganizationalData';
import AddPolicyModal from '../modals/AddPolicyModal';
import { Database } from '../../types/database';

type PolicyDocument = Database['public']['Tables']['policy_documents']['Row'];

export default function PolicyManagement() {
  const { data: policies, loading: policiesLoading, error: policiesError, refetch: refetchPolicies } = usePolicyDocuments();
  const { data: departments, loading: departmentsLoading } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loading = policiesLoading || departmentsLoading;
  const error = policiesError;

  // Filter policies
  const filteredPolicies = policies?.filter(policy => {
    const matchesSearch = searchTerm === '' ||
      policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (policy.tags && policy.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesStatus = selectedStatus === 'all' || policy.status === selectedStatus;
    const matchesType = selectedType === 'all' || policy.document_type === selectedType;
    const matchesDepartment = selectedDepartment === 'all' || policy.department_id === selectedDepartment;
    
    return matchesSearch && matchesStatus && matchesType && matchesDepartment;
  }) || [];

  const handleAddSuccess = () => {
    refetchPolicies();
  };

  const handleDeletePolicy = async (policy: PolicyDocument) => {
    if (window.confirm(`Are you sure you want to delete "${policy.title}"? This action cannot be undone.`)) {
      setDeletingId(policy.id);
      try {
        const { error } = await supabase
          .from('policies')
          .delete()
          .eq('id', policy.id);

        if (error) throw error;
        refetchPolicies();
      } catch (err) {
        console.error('Error deleting policy:', err);
        alert('Failed to delete policy. Please try again.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const downloadPolicy = async (policy: PolicyDocument) => {
    setDownloadingId(policy.id);
    try {
      // Create a formatted document for download
      const docContent = `
${policy.title}
Version: ${policy.version}
Status: ${policy.status}
Department: ${getDepartmentName(policy.department_id)}

${policy.content || 'No content available'}

Created: ${new Date(policy.created_at).toLocaleDateString()}
Last Updated: ${new Date(policy.updated_at).toLocaleDateString()}
      `.trim();

      // Create and download file
      const blob = new Blob([docContent], { type: 'text/plain' });
      downloadFile(blob, `${policy.title.replace(/\s+/g, '_')}_v${policy.version}.txt`);
    } catch (err) {
      console.error('Error downloading policy:', err);
      alert('Failed to download policy. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const getDepartmentName = (departmentId: string | null) => {
    const department = departments?.find(d => d.id === departmentId);
    return department?.name || 'All Departments';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800';
      case 'review':
        return 'bg-amber-100 text-amber-800';
      case 'archived':
        return 'bg-slate-100 text-slate-800';
      default: // draft
        return 'bg-indigo-100 text-indigo-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'review':
        return <Clock className="w-4 h-4" />;
      case 'archived':
        return <AlertCircle className="w-4 h-4" />;
      default: // draft
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'policy':
        return 'HR Policy';
      case 'sop':
        return 'Operations';
      case 'procedure':
        return 'Safety';
      case 'guideline':
        return 'Guideline';
      case 'handbook':
        return 'Other';
      default:
        return type;
    }
  };

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
          <p className="text-red-600 mb-4">Error loading policies: {error}</p>
          <p className="text-slate-600">Please make sure you're connected to Supabase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Policy Management</h2>
          <p className="text-sm text-slate-600 mt-1">Create, organize, and manage company policies and procedures</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Policy</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div className="relative w-full lg:w-auto lg:flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search policies by title, content, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
          />
          {searchTerm && (
            <button 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setSearchTerm('')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="policy">HR Policies</option>
            <option value="sop">Operations</option>
            <option value="procedure">Safety</option>
            <option value="guideline">Guideline</option>
            <option value="handbook">Other</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="review">In Review</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
          >
            <option value="all">All Departments</option>
            {departments?.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Policy Cards */}
      <div className="space-y-4">
        {filteredPolicies.map((policy) => (
          <motion.div
            key={policy.id}
            layout
            className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    policy.status === 'approved' ? 'bg-emerald-100' : 
                    policy.status === 'review' ? 'bg-amber-100' : 
                    policy.status === 'archived' ? 'bg-slate-100' : 'bg-indigo-100'
                  }`}>
                    {getStatusIcon(policy.status)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{policy.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(policy.status)}`}>
                        {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        {getTypeLabel(policy.document_type)}
                      </span>
                      <span className="text-xs text-slate-500">
                        Version {policy.version}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id)}
                    className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm transition-colors"
                  >
                    {expandedPolicy === policy.id ? 'Collapse' : 'View Details'}
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => downloadPolicy(policy)}
                      disabled={downloadingId === policy.id}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Download policy"
                    >
                      {downloadingId === policy.id ? (
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit policy"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePolicy(policy)}
                      disabled={deletingId === policy.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete policy"
                    >
                      {deletingId === policy.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Expanded View */}
              {expandedPolicy === policy.id && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  {/* Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-700">Department: {getDepartmentName(policy.department_id)}</span>
                    </div>
                    
                    {policy.approved_at && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-700">
                          Approved: {new Date(policy.approved_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {policy.review_date && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-700">
                          Review Due: {new Date(policy.review_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {policy.created_by && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-700">Created by: {policy.created_by}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="bg-slate-50 p-4 rounded-lg mb-4">
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap text-slate-700">{policy.content}</div>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  {policy.tags && policy.tags.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Tag className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {policy.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filteredPolicies.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No policies found</h3>
          <p className="text-slate-600 mb-6">
            {searchTerm || selectedStatus !== 'all' || selectedType !== 'all' || selectedDepartment !== 'all' 
              ? 'No policies match your current filters. Try adjusting your search criteria.'
              : 'Get started by creating your first policy document.'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Policy</span>
          </button>
        </div>
      )}

      {/* Add Policy Modal */}
      <AddPolicyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
        departments={departments || []}
      />
    </div>
  );
}