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
import { getGlassmorphismStyles, getColor, MODAL_OVERLAY_STYLES } from '@/styles/glassmorphism-styles';

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
    <div className="fixed inset-0 flex items-center justify-center z-50" style={MODAL_OVERLAY_STYLES}>
      <Card className="w-[500px] max-h-[600px] shadow-2xl flex flex-col" style={getGlassmorphismStyles('dark')}>
        <CardHeader className="text-center flex items-center justify-between" style={{ borderBottom: `1px solid ${getColor('border', 'primary') as string}` }}>
          <div className="flex-1">
            <CardTitle className="text-2xl" style={{ color: getColor('text', 'primary') as string }}>Select a Project</CardTitle>
            <CardDescription className="text-base mt-2" style={{ color: getColor('text', 'secondary') as string }}>
              Choose an existing project or create a new one
            </CardDescription>
          </div>
          
          {/* Sort Control - moved to top right */}
          {projects.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="hover:bg-white/10" style={getGlassmorphismStyles('button')}>
                  <ArrowUpDown className="h-4 w-4 mr-1" style={{ color: getColor('text', 'primary') as string }} />
                  {sortBy === 'name' ? 'Name' : 'Date'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('name')}>
                  Sort by Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('date')}>
                  Sort by Date
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden flex flex-col pt-4">

          {/* Project List */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {sortedProjects.length === 0 ? (
              <div className="text-center py-8" style={{ color: getColor('text', 'secondary') as string }}>
                <FolderOpen className="h-12 w-12 mx-auto mb-3" style={{ color: getColor('text', 'muted') as string }} />
                <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>No projects yet</p>
                <p className="text-xs mt-1" style={{ color: getColor('text', 'muted') as string }}>Create your first project to get started</p>
              </div>
            ) : (
              sortedProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="w-full p-3 rounded-lg hover:bg-white/5 transition-colors text-left group"
                  style={{
                    backgroundColor: getColor('background', 'subtle') as string,
                    backdropFilter: 'blur(0.5px)',
                    WebkitBackdropFilter: 'blur(0.5px)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FolderOpen 
                        className="h-5 w-5 group-hover:text-white flex-shrink-0 transition-colors" 
                        style={{ color: getColor('text', 'muted') as string }}
                      />
                      <span className="font-medium truncate" style={{ color: getColor('text', 'primary') as string }}>{project.name}</span>
                      {project.isCloudOnly && (
                        <Cloud className="h-4 w-4 flex-shrink-0" style={{ color: getColor('status', 'info') as string }} />
                      )}
                    </div>
                    <span className="text-sm ml-2 flex-shrink-0" style={{ color: getColor('text', 'secondary') as string }}>
                      {project.shotCount} {project.shotCount === 1 ? 'shot' : 'shots'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Create New Button */}
          <div className="pt-3" style={{ borderTop: `1px solid ${getColor('border', 'primary') as string}` }}>
            <Button 
              onClick={onCreateNew}
              className="w-full"
              size="lg"
              variant="default"
              style={getGlassmorphismStyles('buttonSecondary')}
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



