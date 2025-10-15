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
      <Card className="w-[500px] max-h-[600px] shadow-2xl flex flex-col">
        <CardHeader className="text-center border-b">
          <CardTitle className="text-2xl">Select a Project</CardTitle>
          <CardDescription className="text-base mt-2">
            Choose an existing project or create a new one
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden flex flex-col pt-4">
          {/* Sort Control */}
          {projects.length > 0 && (
            <div className="mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
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
              <div className="text-center py-8 text-gray-500">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">No projects yet</p>
                <p className="text-xs mt-1">Create your first project to get started</p>
              </div>
            ) : (
              sortedProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="w-full p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FolderOpen className="h-5 w-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate">{project.name}</span>
                      {project.isCloudOnly && (
                        <Cloud className="h-4 w-4 text-blue-500 flex-shrink-0" title="Cloud project" />
                      )}
                    </div>
                    <span className="text-sm text-gray-500 ml-2 flex-shrink-0">
                      {project.shotCount} {project.shotCount === 1 ? 'shot' : 'shots'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Create New Button */}
          <div className="pt-3 border-t">
            <Button 
              onClick={onCreateNew}
              className="w-full"
              size="lg"
              variant="default"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};



