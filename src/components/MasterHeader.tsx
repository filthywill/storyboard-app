import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { Textarea } from '@/components/ui/textarea';
import { Button } from './ui/button';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    templateSettings
  } = useAppStore();

  const projectNameRef = useRef<HTMLTextAreaElement>(null);
  const projectInfoRef = useRef<HTMLTextAreaElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const clientAgencyRef = useRef<HTMLTextAreaElement>(null);
  const jobInfoRef = useRef<HTMLTextAreaElement>(null);

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

  const handleLogoUploadClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProjectLogo(event.target.files[0]);
    }
  };
  
  const handleLogoRemove = () => {
    setProjectLogo(null);
  };

  return (
    <div 
      className={cn(
        "flex items-end justify-between w-full max-w-5xl mx-auto pt-8 pb-2 gap-6 flex-shrink-0"
      )}
      style={{
        minWidth: '1000px',
        maxWidth: '1000px',
        width: '1000px',
        paddingLeft: '33px',
        paddingRight: '33px'
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
              "w-24 h-16"
            )}
            style={{
              width: '96px',
              height: '60px',
              minWidth: '96px',
              minHeight: '60px'
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
                className="w-full h-full border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
                onClick={handleLogoUploadClick}
              >
                <Upload size={24} className="text-gray-400" />
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
                  minHeight: '26px'
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
                  "w-full text-muted-foreground resize-none overflow-hidden border-none focus:ring-0 shadow-none p-0 mt-1 pr-6 text-xs"
                )}
                style={{
                  fontSize: '14px',
                  lineHeight: '1.4',
                  height: 'auto',
                  minHeight: '20px',
                  marginTop: '4px'
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
                minHeight: '22px'
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
                "w-full text-muted-foreground resize-none overflow-hidden border-none focus:ring-0 shadow-none p-0 mt-1 text-right pl-6 text-xs"
              )}
              style={{
                fontSize: '14px',
                lineHeight: '1.4',
                height: 'auto',
                minHeight: '20px',
                marginTop: '4px'
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