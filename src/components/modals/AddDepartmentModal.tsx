import { useState } from 'react';
import { X, Building2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Department, EmployeeProfile } from '../../hooks/useOrganizationalData';
import { handleError } from '../../lib/errorHandler';
import { useOrg } from '../../contexts/OrgContext'; 

interface AddDepartmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  departments: Department[];
  employees: EmployeeProfile[];
}

export default function AddDepartmentModal({ onClose, onSuccess, departments, employees }: AddDepartmentModalProps) {
  const { orgId } = useOrg();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    parent_department_id: '',
    department_lead_id: '',
    location: '',
    contact_email: '',
    budget_allocated: '',
    headcount: '0'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation check for required fields
      if (!formData.name.trim()) {
        setError('Department Name is required');
        setLoading(false);
        return;
      }
      
      if (!orgId) throw new Error('No active organization');

      const departmentData = {
        org_id: orgId,
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        description: formData.description || null,
        location: formData.location || null,
        contact_email: formData.contact_email || null,
        budget_allocated: formData.budget_allocated ? parseFloat(formData.budget_allocated) : null,
        headcount: parseInt(formData.headcount) || 0,
        parent_department_id: formData.parent_department_id || null,
        department_lead_id: formData.department_lead_id || null,
        is_active: true
      };

      // Check for duplicate department name
      const { data: existingDepts, error: checkError } = await supabase
        .from('departments')
        .select('name')
        .eq('org_id', orgId)
        .eq('name', formData.name.trim());
      
      if (checkError) throw checkError;
      if (existingDepts && existingDepts.length > 0) {
        setError('Department with this name already exists');
        setLoading(false);
        return;
      }
      
      // Validate parent department (prevent circular reference)
      if (formData.parent_department_id) {
        const parentDepartment = departments.find(d => d.id === formData.parent_department_id);
        if (!parentDepartment) {
          setError('Selected parent department does not exist');
          setLoading(false);
          return;
        }
      }

      // Now insert the new department
      const { error: insertError } = await supabase
        .from('departments')
        .insert([departmentData]);

      if (insertError) throw insertError;

      onSuccess();
    } catch (err) {
      setError(handleError('AddDepartmentModal', err));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData, 
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cos-modal bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Add New Department</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Department Name *
              </label>
              <input 
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                placeholder="Enter department name"
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-2">
                Department Code
              </label>
              <input 
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                placeholder="E.g., ENG, FIN, HR"
              />
            </div>
            
            <div>
              <label htmlFor="budget_allocated" className="block text-sm font-medium text-slate-700 mb-2">
                Budget Allocated ($)
              </label>
              <input
                type="number"
                id="budget_allocated"
                name="budget_allocated"
                value={formData.budget_allocated}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label htmlFor="department_lead_id" className="block text-sm font-medium text-slate-700 mb-2">
                Manager
              </label>
              <select
                id="department_lead_id"
                name="department_lead_id" 
                value={formData.department_lead_id || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
              >
                <option value="">Select a Manager</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}{emp.title ? ` - ${emp.title}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Information */}
            <div>
              <label htmlFor="parent_department_id" className="block text-sm font-medium text-slate-700 mb-2">
                Parent Department
              </label>
              <select
                id="parent_department_id"
                name="parent_department_id"
                value={formData.parent_department_id || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
              >
                <option value="">No Parent Department</option>
                {departments
                  .filter(dept => dept.is_active !== false)
                  .map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-slate-700 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                id="contact_email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                placeholder="department@company.com"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-2">
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                placeholder="Office location"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
              Description
              <span className="text-slate-400 ml-1">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
              placeholder="Brief description of the department"
            />
          </div>

          <div>
            <label htmlFor="headcount" className="block text-sm font-medium text-slate-700 mb-2">
              Headcount
            </label>
            <input
              type="number"
              id="headcount"
              name="headcount"
              value={formData.headcount}
              onChange={handleInputChange}
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" /> 
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}