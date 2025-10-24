import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { getToolbarContainerStyles, TOOLBAR_STYLES } from '@/styles/toolbar-styles';

export const TemplateSettings: React.FC = () => {
  const {
    templateSettings,
    setTemplateSetting,
    projectName,
    projectInfo,
    clientAgency,
    jobInfo,
  } = useAppStore();

  const headerSettingsItems = [
    { key: 'showLogo', label: 'Logo' },
    { key: 'showProjectName', label: projectName || 'Project Name' },
    { key: 'showProjectInfo', label: projectInfo || 'Project Info' },
    { key: 'showClientAgency', label: clientAgency || 'Client/Agency' },
    { key: 'showJobInfo', label: jobInfo || 'Job Info' },
  ] as const;

  const shotSettingsItems = [
    { key: 'showActionText', label: 'Action Text' },
    { key: 'showScriptText', label: 'Script Text' },
  ] as const;

  const footerSettingsItems = [
    { key: 'showPageNumber', label: 'Page Number' },
  ] as const;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="compact" 
              className="py-1.5 flex items-center justify-center"
              style={getToolbarContainerStyles()}
            >
              <Settings size={16} className={TOOLBAR_STYLES.iconClasses} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Template Settings</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Header Text</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {headerSettingsItems.map((item) => (
          <DropdownMenuCheckboxItem
            key={item.key}
            checked={templateSettings[item.key]}
            onCheckedChange={(checked) => setTemplateSetting(item.key, !!checked)}
            onSelect={(e) => e.preventDefault()}
          >
            {item.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Shot Text</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {shotSettingsItems.map((item) => (
          <DropdownMenuCheckboxItem
            key={item.key}
            checked={templateSettings[item.key]}
            onCheckedChange={(checked) => setTemplateSetting(item.key, !!checked)}
            onSelect={(e) => e.preventDefault()}
          >
            {item.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Footer</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {footerSettingsItems.map((item) => (
          <DropdownMenuCheckboxItem
            key={item.key}
            checked={templateSettings[item.key]}
            onCheckedChange={(checked) => setTemplateSetting(item.key, !!checked)}
            onSelect={(e) => e.preventDefault()}
          >
            {item.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 