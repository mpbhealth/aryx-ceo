import { useState, useMemo } from 'react';
import { useProjects } from '../../hooks/useSupabaseData';
import { FolderOpen, Github, ExternalLink, Users, BarChart3, Plus, Edit, Trash2, Globe } from 'lucide-react';
import AddProjectModal from '../modals/AddProjectModal';
import EditProjectModal from '../modals/EditProjectModal';
import ExportDropdown from '../ui/ExportDropdown';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type Project = Database['public']['Tables']['projects']['Row'];

export default function Projects() {
  const { data: projects, loading, error, refetch } = useProjects();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const exportData = useMemo(() => ({
    title: 'MPB Health Active Projects',
    data: projects.map(project => ({
      Name: project.name,
      Description: project.description,
      Status: project.status,
      Progress: `${project.progress}%`,
      Team: project.team.join(', '),
      'GitHub Link': project.github_link || 'N/A',
      'Monday Link': project.monday_link || 'N/A',
      'Website URL': project.website_url || 'N/A',
      'Created Date': new Date(project.created_at).toLocaleDateString(),
      'Updated Date': new Date(project.updated_at).toLocaleDateString()
    })),
    headers: ['Name', 'Description', 'Status', 'Progress', 'Team', 'GitHub Link', 'Website URL'],
    filename: 'MPB_Health_Active_Projects'
  }), [projects]);

  const avgProgress = useMemo(() => {
    return projects.length > 0 ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length) : 0;
  }, [projects]);

  const uniqueTeamMembers = useMemo(() => {
    return Array.from(new Set(projects.flatMap(p => p.team))).length;
  }, [projects]);

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
          <p className="text-slate-600">Please make sure you're connected to Supabase.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Live':
        return 'bg-emerald-100 text-emerald-800';
      case 'Building':
        return 'bg-amber-100 text-amber-800';
      case 'Planning':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-indigo-500';
  };

  const handleEditProject = (project: Project) => {
    setSelectedProjectForEdit(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteProject = async (project: Project) => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      setDeletingId(project.id);
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', project.id);

        if (error) throw error;
        refetch();
      } catch (err) {
        console.error('Error deleting project:', err);
        alert('Failed to delete project. Please try again.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleAddSuccess = () => {
    refetch();
  };

  const handleEditSuccess = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900">Active Projects</h1>
          <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">Track progress and manage development projects across MPB Health</p>
        </div>
        <div className="flex items-center space-x-3">
          <ExportDropdown data={exportData} />
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            title="Add new project"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Active Projects</p>
              <p className="text-2xl font-bold text-slate-900">{projects.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Avg Progress</p>
              <p className="text-2xl font-bold text-slate-900">
                {avgProgress}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Team Members</p>
              <p className="text-2xl font-bold text-slate-900">
                {uniqueTeamMembers}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 cursor-pointer group hover:border-indigo-200"
            onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{project.name}</h3>
                <p className="text-slate-600 mb-3">{project.description}</p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProject(project);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Edit project"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project);
                    }}
                    disabled={deletingId === project.id}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete project"
                  >
                    {deletingId === project.id ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className={`mb-4 transition-all duration-200 ${selectedProject === project.id ? 'bg-indigo-50 p-3 rounded-lg' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Progress</span>
                <span className="text-sm font-medium text-slate-900">{project.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(project.progress)}`}
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Expanded Details */}
            {selectedProject === project.id && (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-900 mb-2">Project Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Created:</span>
                    <span className="text-slate-900">{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Last Updated:</span>
                    <span className="text-slate-900">{new Date(project.updated_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Team Size:</span>
                    <span className="text-slate-900">{project.team.length} members</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex space-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProject(project);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                      title="Edit project"
                    >
                      Edit Project
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Viewing detailed analytics for ${project.name}`);
                      }}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      title="Delete project"
                      View Analytics
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Team Members */}
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Team Members</p>
              <div className="flex flex-wrap gap-2">
                {project.team.map((member, index) => (
                  <span key={index} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm">
                    {member}
                  </span>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center space-x-2 sm:space-x-4 pt-4 border-t border-slate-200">
              {project.github_link && (
                <a 
                  href={project.github_link}
                  className="flex items-center space-x-1 text-slate-600 hover:text-indigo-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="w-4 h-4" />
                  <span className="text-sm">GitHub</span>
                </a>
              )}
              {project.monday_link && (
                <a 
                  href={project.monday_link}
                  className="flex items-center space-x-1 text-slate-600 hover:text-indigo-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm">Monday.com</span>
                </a>
              )}
              {project.website_url && (
                <a 
                  href={project.website_url}
                  className="flex items-center space-x-1 text-slate-600 hover:text-emerald-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">Website</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">No projects found. Get started by adding your first project.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Project</span>
          </button>
        </div>
      )}

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        project={selectedProjectForEdit}
      />
    </div>
  );
}