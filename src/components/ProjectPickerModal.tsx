import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FolderOpen, Plus, Cloud, ArrowUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectPickerModalProps {
  projects: Array<{
    id: string;
    name: string;
    shotCount: number;
    isCloudOnly: boolean;
  }>;
  onSelectProject: (projectId: string) => void;
  onCreateNew: () => void;
}

export const ProjectPickerModal: React.FC<ProjectPickerModalProps> = ({ 
  projects,
  onSelectProject,
  onCreateNew
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');

  // Sort projects (for now just by name since we have that data)
  const sortedProjects = [...projects].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    // For date sorting, cloud projects maintain their order from the API
    return 0;
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <Card className="w-[500px] max-h-[600px] shadow-2xl flex flex-col" style={{
        backgroundColor: 'rgba(15, 15, 15, 1)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white'
      }}>
        <CardHeader className="text-center border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <CardTitle className="text-2xl text-white">Select a Project</CardTitle>
          <CardDescription className="text-base mt-2 text-white/70">
            Choose an existing project or create a new one
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden flex flex-col pt-4">
          {/* Sort Control */}
          {projects.length > 0 && (
            <div className="mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-white border-white/20 hover:bg-white/10" style={{
                    backgroundColor: 'rgba(1, 1, 1, 0.2)',
                    backdropFilter: 'blur(0.5px)',
                    WebkitBackdropFilter: 'blur(0.5px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    <ArrowUpDown className="h-4 w-4 mr-2 text-white" />
                    Sort by: {sortBy === 'name' ? 'Name' : 'Date'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setSortBy('name')}>
                    Sort by Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('date')}>
                    Sort by Date
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Project List */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {sortedProjects.length === 0 ? (
              <div className="text-center py-8 text-white/70">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 text-white/50" />
                <p className="text-sm text-white/80">No projects yet</p>
                <p className="text-xs mt-1 text-white/60">Create your first project to get started</p>
              </div>
            ) : (
              sortedProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="w-full p-3 rounded-lg border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors text-left group"
                  style={{
                    backgroundColor: 'rgba(1, 1, 1, 0.2)',
                    backdropFilter: 'blur(0.5px)',
                    WebkitBackdropFilter: 'blur(0.5px)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FolderOpen className="h-5 w-5 text-white/60 group-hover:text-white flex-shrink-0" />
                      <span className="font-medium text-white truncate">{project.name}</span>
                      {project.isCloudOnly && (
                        <Cloud className="h-4 w-4 text-blue-400 flex-shrink-0" title="Cloud project" />
                      )}
                    </div>
                    <span className="text-sm text-white/70 ml-2 flex-shrink-0">
                      {project.shotCount} {project.shotCount === 1 ? 'shot' : 'shots'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Create New Button */}
          <div className="pt-3 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <Button 
              onClick={onCreateNew}
              className="w-full text-white"
              size="lg"
              variant="default"
              style={{
                backgroundColor: 'rgba(1, 1, 1, 0.2)',
                backdropFilter: 'blur(0.5px)',
                WebkitBackdropFilter: 'blur(0.5px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Plus className="h-5 w-5 mr-2 text-white" />
              Create New Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};



