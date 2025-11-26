import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { Textarea } from '@/components/ui/textarea';
import { Button } from './ui/button';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getColor } from '@/styles/glassmorphism-styles';

export const MasterHeader: React.FC = () => {
  const { 
    projectName, 
    projectInfo, 
    projectLogoUrl,
    clientAgency,
    jobInfo,
    setProjectName, 
    setProjectInfo,
    setProjectLogo,
    setClientAgency,
    setJobInfo,
    templateSettings,
    storyboardTheme
  } = useAppStore();

  const projectNameRef = useRef<HTMLTextAreaElement>(null);
  const projectInfoRef = useRef<HTMLTextAreaElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const clientAgencyRef = useRef<HTMLTextAreaElement>(null);
  const jobInfoRef = useRef<HTMLTextAreaElement>(null);
  
  // State for dynamic logo container width
  const [logoContainerWidth, setLogoContainerWidth] = useState<number>(96); // Default width
  const [lastProcessedLogoUrl, setLastProcessedLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (projectNameRef.current) {
      projectNameRef.current.style.height = 'auto';
      projectNameRef.current.style.height = `${projectNameRef.current.scrollHeight}px`;
    }
  }, [projectName]);

  useEffect(() => {
    if (projectInfoRef.current) {
      projectInfoRef.current.style.height = 'auto';
      projectInfoRef.current.style.height = `${projectInfoRef.current.scrollHeight}px`;
    }
  }, [projectInfo]);
  
  useEffect(() => {
    if (clientAgencyRef.current) {
      clientAgencyRef.current.style.height = 'auto';
      clientAgencyRef.current.style.height = `${clientAgencyRef.current.scrollHeight}px`;
    }
  }, [clientAgency]);
  
  useEffect(() => {
    if (jobInfoRef.current) {
      jobInfoRef.current.style.height = 'auto';
      jobInfoRef.current.style.height = `${jobInfoRef.current.scrollHeight}px`;
    }
  }, [jobInfo]);

  // Handle dynamic width when projectLogoUrl changes (e.g., loading existing project)
  useEffect(() => {
    // Only process if this is a new/different logo URL
    if (projectLogoUrl === lastProcessedLogoUrl) {
      return;
    }

    if (projectLogoUrl && projectLogoUrl.startsWith('data:')) {
      // If it's a base64 image, calculate dimensions
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const newWidth = Math.min(60 * aspectRatio, 200); // Max 200px width
        setLogoContainerWidth(Math.max(newWidth, 60)); // Min 60px width
        setLastProcessedLogoUrl(projectLogoUrl);
      };
      img.src = projectLogoUrl;
    } else if (projectLogoUrl && projectLogoUrl.includes('supabase')) {
      // If it's a cloud URL, try to get dimensions from the image
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const newWidth = Math.min(60 * aspectRatio, 200); // Max 200px width
        setLogoContainerWidth(Math.max(newWidth, 60)); // Min 60px width
        setLastProcessedLogoUrl(projectLogoUrl);
      };
      img.onerror = () => {
        // If we can't load the image, keep current width instead of resetting
        console.log('Could not load cloud image for dimension calculation, keeping current width');
        setLastProcessedLogoUrl(projectLogoUrl);
      };
      img.src = projectLogoUrl;
    } else if (!projectLogoUrl) {
      // No logo, reset to default
      setLogoContainerWidth(96);
      setLastProcessedLogoUrl(null);
    }
  }, [projectLogoUrl, lastProcessedLogoUrl]);

  const handleLogoUploadClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProjectLogo(event.target.files[0]);
      
      // Calculate container width based on image aspect ratio
      const file = event.target.files[0];
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const newWidth = Math.min(60 * aspectRatio, 200); // Max 200px width
        setLogoContainerWidth(Math.max(newWidth, 60)); // Min 60px width
      };
      img.src = URL.createObjectURL(file);
    }
  };
  
  const handleLogoRemove = () => {
    setProjectLogo(null);
    setLogoContainerWidth(96); // Reset to default width
    setLastProcessedLogoUrl(null); // Reset processed URL
  };

  return (
    <div 
      className={cn(
        "flex items-end justify-between w-full max-w-5xl mx-auto pt-8 pb-2 gap-6 flex-shrink-0 master-header"
      )}
      style={{
        minWidth: '1000px',
        maxWidth: '1000px',
        width: '1000px',
        paddingLeft: '33px',
        paddingRight: '33px',
        color: storyboardTheme.header.text,
      }}
    >
      {/* Left Section: Logo and Project Info */}
      <div 
        className="flex items-end gap-4"
        style={{
          width: '500px',
          flexShrink: 0
        }}
      >
        {templateSettings.showLogo && (
          <div 
            className={cn(
              "relative group flex-shrink-0",
              "h-16"
            )}
            style={{
              width: `${logoContainerWidth}px`,
              height: '60px',
              minWidth: '60px',
              minHeight: '60px',
              transition: 'width 0.3s ease-in-out'
            }}
          >
            {projectLogoUrl ? (
              <>
                <img src={projectLogoUrl} alt="Project Logo" className="w-full h-full object-contain rounded-md" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleLogoRemove}
                >
                  <X size={16} />
                </Button>
              </>
            ) : (
              <div 
                className="w-full h-full border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer transition-colors"
                style={{
                  borderColor: getColor('border', 'dashed') as string,
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = getColor('input', 'border') as string;
                  e.currentTarget.style.backgroundColor = getColor('background', 'lighter') as string;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = getColor('border', 'dashed') as string;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={handleLogoUploadClick}
              >
                <Upload 
                  size={24} 
                  style={{ color: getColor('text', 'muted') as string }}
                />
              </div>
            )}
            <input 
              type="file" 
              ref={logoInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg, image/svg+xml"
              onChange={handleLogoChange}
            />
          </div>
        )}
        
        <div 
          className="flex-grow"
          style={{
            width: '388px',
            flexShrink: 0
          }}
        >
          {templateSettings.showProjectName && (
            <div className="relative group">
              <Textarea
                ref={projectNameRef}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project Name"
                className={cn(
                  "w-full font-bold resize-none overflow-hidden border-none focus:ring-0 shadow-none p-0 pr-6 text-lg"
                )}
                style={{
                  fontSize: '22px',
                  lineHeight: '1.2',
                  height: 'auto',
                  minHeight: '26px',
                  backgroundColor: 'transparent'
                }}
                rows={1}
              />
              {projectName && (
                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-full w-6 text-muted-foreground hover:bg-transparent opacity-0 group-hover:opacity-100" onClick={() => setProjectName('')}><X size={16} /></Button>
              )}
            </div>
          )}
          {templateSettings.showProjectInfo && (
            <div className="relative group">
              <Textarea
                ref={projectInfoRef}
                value={projectInfo}
                onChange={(e) => setProjectInfo(e.target.value)}
                placeholder="Project Info"
                className={cn(
                  "w-full resize-none overflow-hidden border-none focus:ring-0 shadow-none p-0 mt-1 pr-6 text-xs"
                )}
                style={{
                  fontSize: '14px',
                  lineHeight: '1.4',
                  height: 'auto',
                  minHeight: '20px',
                  marginTop: '4px',
                  backgroundColor: 'transparent',
                  color: storyboardTheme.header.text
                }}
                rows={1}
              />
              {projectInfo && (
                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-full w-6 text-muted-foreground hover:bg-transparent opacity-0 group-hover:opacity-100" onClick={() => setProjectInfo('')}><X size={16} /></Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Section: Client and Job Info */}
      <div 
        className="flex-shrink-0 text-right"
        style={{
          width: '250px',
          flexShrink: 0
        }}
      >
        {templateSettings.showClientAgency && (
          <div className="relative group">
            <Textarea
              ref={clientAgencyRef}
              value={clientAgency}
              onChange={(e) => setClientAgency(e.target.value)}
              placeholder="Client/Agency"
              className={cn(
                "w-full font-semibold resize-none overflow-hidden border-none focus:ring-0 shadow-none p-0 text-right pl-6 text-base"
              )}
              style={{
                fontSize: '18px',
                lineHeight: '1.2',
                height: 'auto',
                minHeight: '22px',
                backgroundColor: 'transparent'
              }}
              rows={1}
            />
            {clientAgency && (
              <Button variant="ghost" size="icon" className="absolute top-0 left-0 h-full w-6 text-muted-foreground hover:bg-transparent opacity-0 group-hover:opacity-100" onClick={() => setClientAgency('')}><X size={16} /></Button>
            )}
          </div>
        )}
        {templateSettings.showJobInfo && (
          <div className="relative group">
            <Textarea
              ref={jobInfoRef}
              value={jobInfo}
              onChange={(e) => setJobInfo(e.target.value)}
              placeholder="Job Info"
              className={cn(
                "w-full resize-none overflow-hidden border-none focus:ring-0 shadow-none p-0 mt-1 text-right pl-6 text-xs"
              )}
              style={{
                fontSize: '14px',
                lineHeight: '1.4',
                height: 'auto',
                minHeight: '20px',
                marginTop: '4px',
                backgroundColor: 'transparent',
                color: storyboardTheme.header.text
              }}
              rows={1}
            />
            {jobInfo && (
              <Button variant="ghost" size="icon" className="absolute top-0 left-0 h-full w-6 text-muted-foreground hover:bg-transparent opacity-0 group-hover:opacity-100" onClick={() => setJobInfo('')}><X size={16} /></Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 