import { useState } from 'react';
import {
  useDepartments,
  useEmployeeProfiles,
  useDepartmentRelationships,
  useOrgChartPositions,
  Department,
  EmployeeProfile
} from '../../hooks/useOrganizationalData';
import {
  Building2,
  Users,
  GitBranch,
  Plus,
  Search,
  Save,
  Edit,
  BarChart3,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import InteractiveOrgChart from '../ui/InteractiveOrgChart';
import DepartmentManagement from '../ui/DepartmentManagement';
import EmployeeManagement from '../ui/EmployeeManagement'; 
import PolicyManagement from './PolicyManagement';
import AddDepartmentModal from '../modals/AddDepartmentModal';
import AddEmployeeModal from '../modals/AddEmployeeModal';
import EditEmployeeModal from '../modals/EditEmployeeModal';
import EditDepartmentModal from '../modals/EditDepartmentModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-lg ${
      type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">×</button>
    </div>
  );
}

export default function OrganizationalStructure() {
  const [activeTab, setActiveTab] = useState('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Modal states
  const [isAddDepartmentModalOpen, setIsAddDepartmentModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [isEditDepartmentModalOpen, setIsEditDepartmentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Selected items for editing/deleting
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'employee' | 'department'; item: EmployeeProfile | Department } | null>(null);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: departments, loading: departmentsLoading, error: departmentsError, refetch: refetchDepartments, deleteDepartment } = useDepartments();
  const { data: employees, loading: employeesLoading, error: employeesError, refetch: refetchEmployees, deleteEmployee } = useEmployeeProfiles();
  const { data: relationships, loading: relationshipsLoading } = useDepartmentRelationships();
  const { data: positions, updatePosition, saveLayout, resetLayout } = useOrgChartPositions();

  const loading = departmentsLoading || employeesLoading || relationshipsLoading;
  const error = departmentsError || employeesError;

  // Show toast helper
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading organizational data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading organizational data: {error}</p>
          <p className="text-slate-600">Please make sure you're connected to Supabase.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'org-chart', label: 'Org Chart', icon: GitBranch },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'policies', label: 'Policies', icon: FileText },
  ];

  // Calculate organizational metrics
  const totalEmployees = employees.length;
  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.is_active).length;
  const activeEmployees = employees.filter(e => e.employment_status === 'active').length;
  const avgDepartmentSize = totalDepartments > 0 ? Math.round(totalEmployees / totalDepartments) : 0;

  // Get managers list for employee modals
  const managers = employees.map(e => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`
  }));
  
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };
  
  const handleSaveLayout = async () => {
    try {
      await saveLayout();
      showToast('Layout saved successfully', 'success');
      return true;
    } catch (error) {
      console.error('Error saving layout:', error);
      showToast('Failed to save layout', 'error');
      throw error;
    }
  };
  
  const handleResetLayout = async () => {
    try {
      await resetLayout();
      showToast('Layout reset successfully', 'success');
      return true; 
    } catch (error) {
      console.error('Error resetting layout:', error);
      showToast('Failed to reset layout', 'error');
      throw error;
    }
  };
  
  // Department handlers
  const handleAddDepartment = () => {
    setIsAddDepartmentModalOpen(true);
  };

  const handleEditDepartment = (dept: Department) => {
    setSelectedDepartment(dept);
    setIsEditDepartmentModalOpen(true);
  };

  const handleDeleteDepartment = (dept: Department) => {
    // Check for child departments
    const childDepartments = departments.filter(d => d.parent_department_id === dept.id);
    if (childDepartments.length > 0) {
      showToast(`Cannot delete: ${childDepartments.length} child departments exist`, 'error');
      return;
    }
    
    // Check for assigned employees
    const assignedEmployees = employees.filter(e => e.primary_department_id === dept.id);
    if (assignedEmployees.length > 0) {
      showToast(`Cannot delete: ${assignedEmployees.length} employees assigned`, 'error');
      return;
    }
    
    setDeleteTarget({ type: 'department', item: dept });
    setIsDeleteModalOpen(true);
  };

  const handleAddDepartmentSuccess = () => {
    refetchDepartments();
    setIsAddDepartmentModalOpen(false);
    showToast('Department added successfully', 'success');
  };

  const handleEditDepartmentSuccess = () => {
    refetchDepartments();
    setIsEditDepartmentModalOpen(false);
    setSelectedDepartment(null);
    showToast('Department updated successfully', 'success');
  };

  // Employee handlers
  const handleAddEmployee = () => {
    setIsAddEmployeeModalOpen(true);
  };

  const handleEditEmployee = (emp: EmployeeProfile) => {
    setSelectedEmployee(emp);
    setIsEditEmployeeModalOpen(true);
  };

  const handleDeleteEmployee = (emp: EmployeeProfile) => {
    setDeleteTarget({ type: 'employee', item: emp });
    setIsDeleteModalOpen(true);
  };

  const handleAddEmployeeSuccess = () => {
    refetchEmployees();
    setIsAddEmployeeModalOpen(false);
    showToast('Employee added successfully', 'success');
  };

  const handleEditEmployeeSuccess = () => {
    refetchEmployees();
    setIsEditEmployeeModalOpen(false);
    setSelectedEmployee(null);
    showToast('Employee updated successfully', 'success');
  };

  // Delete confirmation handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      if (deleteTarget.type === 'employee') {
        await deleteEmployee(deleteTarget.item.id);
        showToast('Employee deleted successfully', 'success');
      } else {
        await deleteDepartment(deleteTarget.item.id);
        showToast('Department deleted successfully', 'success');
      }
    } catch (err) {
      showToast('Failed to delete', 'error');
      throw err;
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDepartmentSelect = (departmentId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    if (dept) {
      handleEditDepartment(dept);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-slate-600 mt-2">Manage employees, departments, and organizational structure</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={handleAddEmployee}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Add Employee</span>
          </button>
          
          <button 
            onClick={handleAddDepartment}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Employees</p>
              <p className="text-2xl font-bold text-slate-900">{totalEmployees}</p>
              <p className="text-xs text-emerald-600 font-medium">{activeEmployees} active</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Departments</p>
              <p className="text-2xl font-bold text-slate-900">{activeDepartments}</p>
              <p className="text-xs text-slate-500">of {totalDepartments} total</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Avg Team Size</p>
              <p className="text-2xl font-bold text-slate-900">{avgDepartmentSize}</p>
              <p className="text-xs text-slate-500">per department</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Relationships</p>
              <p className="text-2xl font-bold text-slate-900">{relationships.length}</p>
              <p className="text-xs text-slate-500">dept connections</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 px-4">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'employees' && (
          <EmployeeManagement
            employees={employees}
            departments={departments}
            onEdit={handleEditEmployee}
            onDelete={handleDeleteEmployee}
            onAdd={handleAddEmployee}
            onRefresh={refetchEmployees}
            searchTerm={searchTerm}
          />
        )}

        {activeTab === 'departments' && (
          <DepartmentManagement
            departments={departments}
            employees={employees}
            onEdit={handleEditDepartment}
            onDelete={handleDeleteDepartment}
            onAddDepartment={handleAddDepartment}
            onRefresh={refetchDepartments}
            searchTerm={searchTerm}
          />
        )}

        {activeTab === 'org-chart' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Interactive Organization Chart</h2>
              <div className="flex items-center space-x-3">
                <p className="text-sm text-slate-500">
                  Chart uses department parents and reporting lines. Dragged layout is not stored on this project.
                </p>
              </div>
            </div>
            
            <InteractiveOrgChart
              departments={departments}
              employees={employees}
              relationships={relationships}
              positions={positions}
              onPositionUpdate={updatePosition}
              isEditMode={false}
              onSaveLayout={handleSaveLayout}
              onResetLayout={handleResetLayout}
              onDepartmentSelect={handleDepartmentSelect}
              searchTerm={searchTerm || ''}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Organizational Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Size Distribution */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-4">Department Size Distribution</h3>
                <div className="space-y-3">
                  {departments.slice(0, 8).map((dept) => {
                    const deptEmployees = employees.filter(e => e.primary_department_id === dept.id);
                    const percentage = totalEmployees > 0 ? (deptEmployees.length / totalEmployees) * 100 : 0;
                    
                    return (
                      <div key={dept.id} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 truncate max-w-[150px]">{dept.name}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(percentage * 3, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 w-8 text-right">
                            {deptEmployees.length}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Employment Status */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-4">Employment Status</h3>
                <div className="space-y-3">
                  {[
                    { status: 'active', label: 'Active', color: 'from-emerald-500 to-green-500' },
                    { status: 'on_leave', label: 'On Leave', color: 'from-amber-500 to-orange-500' },
                    { status: 'inactive', label: 'Inactive', color: 'from-slate-400 to-slate-500' },
                    { status: 'terminated', label: 'Terminated', color: 'from-red-500 to-rose-500' },
                  ].map(({ status, label, color }) => {
                    const count = employees.filter(e => e.employment_status === status).length;
                    const percentage = totalEmployees > 0 ? (count / totalEmployees) * 100 : 0;
                    
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">{label}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-slate-200 rounded-full h-2">
                            <div 
                              className={`bg-gradient-to-r ${color} h-2 rounded-full transition-all duration-300`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reporting Structure */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-4">Reporting Structure</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-indigo-600">
                      {employees.filter(e => employees.some(emp => emp.reports_to_id === e.id)).length}
                    </p>
                    <p className="text-sm text-slate-600">Managers</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {employees.filter(e => e.reports_to_id !== null).length}
                    </p>
                    <p className="text-sm text-slate-600">With Reports To</p>
                  </div>
                </div>
              </div>

              {/* Employment Types */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-4">Employment Types</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { type: 'full_time', label: 'Full Time', color: 'bg-emerald-500' },
                    { type: 'part_time', label: 'Part Time', color: 'bg-blue-500' },
                    { type: 'contract', label: 'Contract', color: 'bg-amber-500' },
                    { type: 'intern', label: 'Intern', color: 'bg-purple-500' },
                  ].map(({ type, label, color }) => {
                    const count = employees.filter(e => e.employment_type === type).length;
                    return (
                      <div key={type} className="bg-white p-3 rounded-lg flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${color}`}></div>
                        <div>
                          <p className="text-lg font-bold text-slate-900">{count}</p>
                          <p className="text-xs text-slate-500">{label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <PolicyManagement />
        )}
      </div>
      
      {/* Modals */}
      {isAddDepartmentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <AddDepartmentModal 
            onClose={() => setIsAddDepartmentModalOpen(false)} 
            onSuccess={handleAddDepartmentSuccess} 
            departments={departments} 
            employees={employees} 
          />
        </div>
      )}

      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        onSuccess={handleAddEmployeeSuccess}
        departments={departments}
        managers={managers}
      />

      <EditEmployeeModal
        isOpen={isEditEmployeeModalOpen}
        onClose={() => {
          setIsEditEmployeeModalOpen(false);
          setSelectedEmployee(null);
        }}
        onSuccess={handleEditEmployeeSuccess}
        employee={selectedEmployee}
        departments={departments}
        managers={managers}
      />

      <EditDepartmentModal
        isOpen={isEditDepartmentModalOpen}
        onClose={() => {
          setIsEditDepartmentModalOpen(false);
          setSelectedDepartment(null);
        }}
        onSuccess={handleEditDepartmentSuccess}
        department={selectedDepartment}
        departments={departments}
        employees={employees}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteTarget?.type === 'employee' ? 'Employee' : 'Department'}`}
        itemName={deleteTarget?.type === 'employee'
          ? `${(deleteTarget.item as EmployeeProfile).first_name} ${(deleteTarget.item as EmployeeProfile).last_name}`
          : (deleteTarget?.item as Department)?.name || ''
        }
        itemType={deleteTarget?.type || 'item'}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
