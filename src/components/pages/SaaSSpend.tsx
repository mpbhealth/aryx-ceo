import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useSaaSExpenses } from '../../hooks/useSaaSExpenses';
import type { SaaSExpenseRow } from '../../hooks/useSaaSExpenses';
import SaaSExpenseUploader from '../ui/SaaSExpenseUploader';
import { CreditCard, TrendingUp, Calendar, DollarSign, Edit, Trash2, Plus } from 'lucide-react';
import ExportDropdown from '../ui/ExportDropdown';
import { motion } from 'framer-motion';

interface SaaSExpenseFormData {
  department: string;
  application: string;
  description: string;
  cost_monthly: number;
  cost_annual: number;
  platform: string;
  url: string;
  renewal_date: string;
  notes: string;
}

export default function SaaSSpend() {
  const { data: expenses, loading, error, metrics, refetch: _refetch, addExpense, updateExpense, deleteExpense, bulkImport } = useSaaSExpenses();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showImporter, setShowImporter] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<SaaSExpenseRow | null>(null);
  const [formData, setFormData] = useState<SaaSExpenseFormData>({
    department: '',
    application: '',
    description: '',
    cost_monthly: 0,
    cost_annual: 0,
    platform: '',
    url: '',
    renewal_date: '',
    notes: ''
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
          <p className="text-red-600 mb-4">Error loading data: {error}</p>
          <p className="text-slate-600">Please make sure the saas_expenses table exists in Supabase.</p>
        </div>
      </div>
    );
  }

  const departments = ['All', ...Array.from(new Set(expenses.map(expense => expense.department)))];
  
  const filteredExpenses = expenses.filter(expense => 
    selectedCategory === 'All' || expense.department === selectedCategory
  );

  const getRenewalStatus = (renewalDate: string) => {
    const renewal = new Date(renewalDate);
    const today = new Date();
    const daysUntilRenewal = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilRenewal < 30) return { status: 'urgent', color: 'bg-red-100 text-red-800' };
    if (daysUntilRenewal < 60) return { status: 'warning', color: 'bg-amber-100 text-amber-800' };
    return { status: 'ok', color: 'bg-emerald-100 text-emerald-800' };
  };

  const handleEditExpense = (expense: SaaSExpenseRow) => {
    setSelectedExpense(expense);
    setFormData({
      department: expense.department,
      application: expense.application,
      description: expense.description || '',
      cost_monthly: expense.cost_monthly,
      cost_annual: expense.cost_annual,
      platform: expense.platform || '',
      url: expense.url || '',
      renewal_date: expense.renewal_date || '',
      notes: expense.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteExpense = async (expense: SaaSExpenseRow) => {
    if (window.confirm(`Are you sure you want to delete "${expense.application}"? This action cannot be undone.`)) {
      setDeletingId(expense.id);
      try {
        const result = await deleteExpense(expense.id);
        if (!result.success) {
          throw new Error(result.error);
        }
      } catch (err) {
        console.error('Error deleting expense:', err);
        alert('Failed to delete expense. Please try again.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const resetFormData = () => {
    setFormData({
      department: '',
      application: '',
      description: '',
      cost_monthly: 0,
      cost_annual: 0,
      platform: '',
      url: '',
      renewal_date: '',
      notes: ''
    });
  };

  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await addExpense(formData);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      resetFormData();
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Error adding expense:', err);
      alert('Failed to add expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    
    setIsSubmitting(true);
    
    try {
      const result = await updateExpense(selectedExpense.id, formData);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setIsEditModalOpen(false);
      setSelectedExpense(null);
    } catch (err) {
      console.error('Error updating expense:', err);
      alert('Failed to update expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleImportSuccess = (_count: number) => {
    // Refresh data after successful import
    // The hook will automatically refresh, no need to call refetch
  };

  const handleImportError = (error: string) => {
    console.error('Import error:', error);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900">SaaS Spend Management</h1>
          <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">Track and optimize software subscriptions and departmental SaaS costs</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
          <button 
            onClick={() => setShowImporter(!showImporter)}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{showImporter ? 'Hide Importer' : 'Import CSV'}</span>
          </button>
          <ExportDropdown data={{
            title: 'MPB Health SaaS Expenses Report',
            data: expenses.map(expense => ({
              Department: expense.department,
              Application: expense.application,
              Description: expense.description || '',
              'Monthly Cost': `$${expense.cost_monthly}`,
              'Annual Cost': `$${expense.cost_annual}`,
              Platform: expense.platform || '',
              URL: expense.url || '',
              'Renewal Date': expense.renewal_date ? new Date(expense.renewal_date).toLocaleDateString() : 'N/A',
              Notes: expense.notes || '',
              'Source Sheet': expense.source_sheet,
              'Created Date': new Date(expense.created_at).toLocaleDateString()
            })),
            headers: ['Department', 'Application', 'Monthly Cost', 'Annual Cost', 'Platform', 'Renewal Date'],
            filename: 'MPB_Health_SaaS_Expenses_Report'
          }} />
          <button 
            onClick={() => {
              resetFormData();
              setIsAddModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            title="Add new expense"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* CSV Import Section */}
      {showImporter && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SaaSExpenseUploader
            onSuccess={handleImportSuccess}
            onError={handleImportError}
            onBulkImport={bulkImport}
          />
        </motion.div>
      )}

      {/* Spend Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Monthly Spend</p>
              <p className="text-2xl font-bold text-slate-900">${metrics.totalMonthly.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Annual Spend</p>
              <p className="text-2xl font-bold text-slate-900">${metrics.totalAnnual.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Departments</p>
              <p className="text-2xl font-bold text-slate-900">{metrics.totalDepartments}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">SaaS Tools</p>
              <p className="text-2xl font-bold text-slate-900">{metrics.totalTools}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Department Filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-slate-700">Filter by department:</label>
        <select
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filter by department"
        >
          {departments.map(department => (
            <option key={department} value={department}>{department}</option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-sm font-semibold text-slate-900">Application</th>
                <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-sm font-semibold text-slate-900">Department</th>
                <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-sm font-semibold text-slate-900">Monthly Cost</th>
                <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-sm font-semibold text-slate-900">Annual Cost</th>
                <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-sm font-semibold text-slate-900">Renewal</th>
                <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-sm font-semibold text-slate-900">Platform</th>
                <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExpenses.map((expense) => {
                const renewalStatus = expense.renewal_date ? getRenewalStatus(expense.renewal_date) : { status: 'ok', color: 'bg-slate-100 text-slate-600' };
                return (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{expense.application}</p>
                        <p className="text-sm text-slate-600">{expense.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{expense.department}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <span className="font-semibold text-slate-900">${expense.cost_monthly}</span>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <span className="font-semibold text-slate-900">${expense.cost_annual}</span>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      {expense.renewal_date ? (
                        <div>
                          <p className="text-sm text-slate-900">{new Date(expense.renewal_date).toLocaleDateString()}</p>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${renewalStatus.color}`}>
                            {renewalStatus.status === 'urgent' ? 'Urgent' : 
                             renewalStatus.status === 'warning' ? 'Soon' : 'OK'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">Not set</span>
                      )}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <div>
                        <p className="text-sm text-slate-900">{expense.platform || 'N/A'}</p>
                        {expense.url && (
                          <a 
                            href={expense.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            Visit →
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEditExpense(expense)}
                          className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit expense"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteExpense(expense)}
                          disabled={deletingId === expense.id}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete expense"
                        >
                          {deletingId === expense.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No SaaS expenses found for the selected department.</p>
            <button
              onClick={() => {
                resetFormData();
                setIsAddModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First SaaS Expense</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Expense Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="cos-modal bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Edit SaaS Expense</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedExpense(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Application Name *
                  </label>
                  <input
                    type="text"
                    name="application"
                    required
                    value={formData.application}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Monthly Cost *
                  </label>
                  <input
                    type="number"
                    name="cost_monthly"
                    required
                    step="0.01"
                    min="0"
                    value={formData.cost_monthly}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Annual Cost *
                  </label>
                  <input
                    type="number"
                    name="cost_annual"
                    required
                    step="0.01"
                    min="0"
                    value={formData.cost_annual}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Platform
                  </label>
                  <input
                    type="text"
                    name="platform"
                    value={formData.platform}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    name="renewal_date"
                    value={formData.renewal_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    URL
                  </label>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                  ></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedExpense(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Updating...' : 'Update Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="cos-modal bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Add New SaaS Expense</h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetFormData();
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Application Name *
                  </label>
                  <input
                    type="text"
                    name="application"
                    required
                    value={formData.application}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="e.g., Supabase, GitHub, etc."
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
                    placeholder="e.g., Engineering, Marketing, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Monthly Cost *
                  </label>
                  <input
                    type="number"
                    name="cost_monthly"
                    required
                    min="0"
                    step="0.01"
                    value={formData.cost_monthly}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="49.99"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Annual Cost *
                  </label>
                  <input
                    type="number"
                    name="cost_annual"
                    required
                    min="0"
                    step="0.01"
                    value={formData.cost_annual}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="599.88"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Platform
                  </label>
                  <input
                    type="text"
                    name="platform"
                    value={formData.platform}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="e.g., Cloud Platform, SaaS Tool"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    name="renewal_date"
                    value={formData.renewal_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    URL
                  </label>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="Brief description of the tool's purpose"
                  ></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-indigo-500"
                    placeholder="Additional notes or comments"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetFormData();
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Expense</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}