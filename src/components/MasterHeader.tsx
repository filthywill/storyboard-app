import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { Textarea } from '@/components/ui/textarea';
import { Button } from './ui/button';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServerPDFExportPayload } from '@/utils/types/exportTypes';
import { RENDERED_PAGE_WIDTH_PX } from '@/utils/pageSize';
import { getStoryboardHeaderAlignmentInsetCss, calculateStoryboardLogoContainerWidth } from '@/utils/storyboardLayout';

interface MasterHeaderProps {
  readOnly?: boolean;
  exportPayload?: ServerPDFExportPayload;
  gridCols: number;
}

const parseRgbColor = (color: string | undefined): { r: number; g: number; b: number } | null => {
  if (!color) return null;
  const trimmed = color.trim().toLowerCase();

  if (trimmed === 'white') return { r: 255, g: 255, b: 255 };
  if (trimmed === 'black') return { r: 0, g: 0, b: 0 };

  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const expanded = hex.length === 3
      ? hex.split('').map((char) => `${char}${char}`).join('')
      : hex;

    return {
      r: parseInt(expanded.slice(0, 2), 16),
      g: parseInt(expanded.slice(2, 4), 16),
      b: parseInt(expanded.slice(4, 6), 16),
    };
  }

  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }

  return null;
};

const getRelativeLuminance = ({ r, g, b }: { r: number; g: number; b: number }): number => {
  const normalize = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  };

  return (0.2126 * normalize(r)) + (0.7152 * normalize(g)) + (0.0722 * normalize(b));
};

const LOGO_PLACEHOLDER_CONTAINER_WIDTH = 96;

const loadLogoContainerWidthFromUrl = (
  url: string,
  callbacks: {
    onSuccess: (width: number, loadedUrl: string) => void;
    onFailure?: (loadedUrl: string) => void;
  }
): (() => void) => {
  const img = new Image();
  let cancelled = false;

  img.onload = () => {
    if (cancelled) {
      return;
    }

    callbacks.onSuccess(
      calculateStoryboardLogoContainerWidth(img.naturalWidth, img.naturalHeight),
      url
    );
  };

  img.onerror = () => {
    if (cancelled) {
      return;
    }

    callbacks.onFailure?.(url);
  };

  img.src = url;

  return () => {
    cancelled = true;
    img.onload = null;
    img.onerror = null;
  };
};

const getLogoPlaceholderStyles = (contentBackground: string | undefined) => {
  const rgb = parseRgbColor(contentBackground);
  const isLightBackground = rgb ? getRelativeLuminance(rgb) > 0.45 : true;

  if (isLightBackground) {
    return {
      borderColor: 'rgba(0, 0, 0, 0.32)',
      backgroundColor: 'rgba(0, 0, 0, 0.035)',
      color: 'rgba(0, 0, 0, 0.68)',
      hoverBorderColor: 'rgba(0, 0, 0, 0.48)',
      hoverBackgroundColor: 'rgba(0, 0, 0, 0.065)',
      hoverColor: 'rgba(0, 0, 0, 0.82)',
    };
  }

  return {
    borderColor: 'rgba(255, 255, 255, 0.42)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.78)',
    hoverBorderColor: 'rgba(255, 255, 255, 0.62)',
    hoverBackgroundColor: 'rgba(255, 255, 255, 0.12)',
    hoverColor: 'rgba(255, 255, 255, 0.92)',
  };
};

const ConnectedMasterHeader: React.FC<{ readOnly?: boolean; gridCols: number }> = ({ readOnly = false, gridCols }) => {
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
  const [logoContainerWidth, setLogoContainerWidth] = useState<number>(LOGO_PLACEHOLDER_CONTAINER_WIDTH);
  const activeLogoUrlRef = useRef<string | null>(null);
  const uploadPreviewCleanupRef = useRef<(() => void) | null>(null);
  const uploadPreviewIdRef = useRef(0);

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

  const showLowerMetadataRow = templateSettings.showProjectInfo || templateSettings.showJobInfo;

  // Handle dynamic width when projectLogoUrl changes (e.g., loading existing project)
  useEffect(() => {
    if (!projectLogoUrl) {
      activeLogoUrlRef.current = null;
      setLogoContainerWidth(LOGO_PLACEHOLDER_CONTAINER_WIDTH);
      return;
    }

    activeLogoUrlRef.current = projectLogoUrl;

    return loadLogoContainerWidthFromUrl(projectLogoUrl, {
      onSuccess: (width, loadedUrl) => {
        if (activeLogoUrlRef.current !== loadedUrl) {
          return;
        }

        setLogoContainerWidth(width);
      },
      onFailure: (loadedUrl) => {
        if (activeLogoUrlRef.current !== loadedUrl) {
          return;
        }
      },
    });
  }, [projectLogoUrl]);

  useEffect(() => {
    return () => {
      uploadPreviewCleanupRef.current?.();
      uploadPreviewCleanupRef.current = null;
    };
  }, []);

  const handleLogoUploadClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    uploadPreviewCleanupRef.current?.();
    const previewId = uploadPreviewIdRef.current + 1;
    uploadPreviewIdRef.current = previewId;

    const previewUrl = URL.createObjectURL(file);
    uploadPreviewCleanupRef.current = loadLogoContainerWidthFromUrl(previewUrl, {
      onSuccess: (width) => {
        if (uploadPreviewIdRef.current !== previewId) {
          URL.revokeObjectURL(previewUrl);
          return;
        }

        setLogoContainerWidth(width);
        URL.revokeObjectURL(previewUrl);
        uploadPreviewCleanupRef.current = null;
      },
      onFailure: () => {
        if (uploadPreviewIdRef.current !== previewId) {
          URL.revokeObjectURL(previewUrl);
          return;
        }

        URL.revokeObjectURL(previewUrl);
        uploadPreviewCleanupRef.current = null;
      },
    });

    setProjectLogo(file);
  };
  
  const handleLogoRemove = () => {
    uploadPreviewIdRef.current += 1;
    uploadPreviewCleanupRef.current?.();
    uploadPreviewCleanupRef.current = null;
    activeLogoUrlRef.current = null;
    setProjectLogo(null);
    setLogoContainerWidth(LOGO_PLACEHOLDER_CONTAINER_WIDTH);
  };

  const logoPlaceholderStyles = getLogoPlaceholderStyles(storyboardTheme.contentBackground);
  const headerAlignmentInset = getStoryboardHeaderAlignmentInsetCss(gridCols);

  return (
    <div 
      className={cn(
        "flex items-end justify-between w-full max-w-5xl mx-auto pt-8 pb-2 gap-6 flex-shrink-0 master-header"
      )}
      style={{
        minWidth: `${RENDERED_PAGE_WIDTH_PX}px`,
        maxWidth: `${RENDERED_PAGE_WIDTH_PX}px`,
        width: `${RENDERED_PAGE_WIDTH_PX}px`,
        paddingLeft: headerAlignmentInset,
        paddingRight: headerAlignmentInset,
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
                className="w-full h-full border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors"
                style={{
                  borderColor: logoPlaceholderStyles.borderColor,
                  backgroundColor: logoPlaceholderStyles.backgroundColor,
                  color: logoPlaceholderStyles.color
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = logoPlaceholderStyles.hoverBorderColor;
                  e.currentTarget.style.backgroundColor = logoPlaceholderStyles.hoverBackgroundColor;
                  e.currentTarget.style.color = logoPlaceholderStyles.hoverColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = logoPlaceholderStyles.borderColor;
                  e.currentTarget.style.backgroundColor = logoPlaceholderStyles.backgroundColor;
                  e.currentTarget.style.color = logoPlaceholderStyles.color;
                }}
                onClick={handleLogoUploadClick}
              >
                <Upload 
                  size={18} 
                  style={{ color: 'inherit' }}
                />
                <span className="text-[10px] font-medium leading-none" style={{ color: 'inherit' }}>
                  Upload Logo
                </span>
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
              {readOnly ? (
                <div
                  className={cn(
                    "w-full font-bold p-0 pr-6 text-lg whitespace-pre-wrap"
                  )}
                  style={{
                    fontSize: '22px',
                    lineHeight: '1.2',
                    minHeight: '26px',
                    backgroundColor: 'transparent'
                  }}
                >
                  {projectName || 'Project Name'}
                </div>
              ) : (
                <>
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
                </>
              )}
              {!readOnly && projectName && (
                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-full w-6 text-muted-foreground hover:bg-transparent opacity-0 group-hover:opacity-100" onClick={() => setProjectName('')}><X size={16} /></Button>
              )}
            </div>
          )}
          {templateSettings.showProjectInfo && (
            <div className="relative group">
              {readOnly ? (
                <div
                  className={cn(
                    "w-full p-0 mt-1 pr-6 text-xs whitespace-pre-wrap"
                  )}
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.4',
                    minHeight: '20px',
                    marginTop: '4px',
                    backgroundColor: 'transparent',
                    color: storyboardTheme.header.text
                  }}
                >
                  {projectInfo || 'Project Info'}
                </div>
              ) : (
                <>
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
                </>
              )}
              {!readOnly && projectInfo && (
                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-full w-6 text-muted-foreground hover:bg-transparent opacity-0 group-hover:opacity-100" onClick={() => setProjectInfo('')}><X size={16} /></Button>
              )}
            </div>
          )}
          {showLowerMetadataRow && !templateSettings.showProjectInfo && (
            <div
              aria-hidden="true"
              className="w-full p-0 mt-1 pr-6 text-xs whitespace-pre-wrap invisible pointer-events-none"
              style={{
                fontSize: '14px',
                lineHeight: '1.4',
                minHeight: '20px',
                marginTop: '4px',
                backgroundColor: 'transparent'
              }}
            />
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
            {readOnly ? (
              <div
                className={cn(
                  "w-full font-semibold p-0 text-right pl-6 text-base whitespace-pre-wrap"
                )}
                style={{
                  fontSize: '18px',
                  lineHeight: '1.2',
                  minHeight: '22px',
                  backgroundColor: 'transparent'
                }}
              >
                {clientAgency || 'Client/Agency'}
              </div>
            ) : (
              <>
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
              </>
            )}
            {!readOnly && clientAgency && (
              <Button variant="ghost" size="icon" className="absolute top-0 left-0 h-full w-6 text-muted-foreground hover:bg-transparent opacity-0 group-hover:opacity-100" onClick={() => setClientAgency('')}><X size={16} /></Button>
            )}
          </div>
        )}
        {templateSettings.showJobInfo && (
          <div className="relative group">
            {readOnly ? (
              <div
                className={cn(
                  "w-full p-0 mt-1 text-right pl-6 text-xs whitespace-pre-wrap"
                )}
                style={{
                  fontSize: '14px',
                  lineHeight: '1.4',
                  minHeight: '20px',
                  marginTop: '4px',
                  backgroundColor: 'transparent',
                  color: storyboardTheme.header.text
                }}
              >
                {jobInfo || 'Job Info'}
              </div>
            ) : (
              <>
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
              </>
            )}
            {!readOnly && jobInfo && (
              <Button variant="ghost" size="icon" className="absolute top-0 left-0 h-full w-6 text-muted-foreground hover:bg-transparent opacity-0 group-hover:opacity-100" onClick={() => setJobInfo('')}><X size={16} /></Button>
            )}
          </div>
        )}
        {showLowerMetadataRow && !templateSettings.showJobInfo && (
          <div
            aria-hidden="true"
            className="w-full p-0 mt-1 text-right pl-6 text-xs whitespace-pre-wrap invisible pointer-events-none"
            style={{
              fontSize: '14px',
              lineHeight: '1.4',
              minHeight: '20px',
              marginTop: '4px',
              backgroundColor: 'transparent'
            }}
          />
        )}
      </div>
    </div>
  );
};

const ExportMasterHeader: React.FC<{ exportPayload: ServerPDFExportPayload; gridCols: number }> = ({ exportPayload, gridCols }) => {
  const { template, project, theme } = exportPayload;
  const logoSource = project.projectLogo
    ? project.projectLogo.kind === 'dataUrl'
      ? project.projectLogo.dataUrl
      : project.projectLogo.url
    : null;
  const showLowerMetadataRow = template.showProjectInfo || template.showJobInfo;
  const headerAlignmentInset = getStoryboardHeaderAlignmentInsetCss(gridCols);

  return (
    <div
      className={cn(
        "flex items-end justify-between w-full max-w-5xl mx-auto pt-8 pb-2 gap-6 flex-shrink-0 master-header"
      )}
      style={{
        minWidth: `${RENDERED_PAGE_WIDTH_PX}px`,
        maxWidth: `${RENDERED_PAGE_WIDTH_PX}px`,
        width: `${RENDERED_PAGE_WIDTH_PX}px`,
        paddingLeft: headerAlignmentInset,
        paddingRight: headerAlignmentInset,
        color: theme.header.text,
      }}
    >
      <div
        className="flex items-end gap-4"
        style={{
          width: '500px',
          flexShrink: 0
        }}
      >
        {template.showLogo && logoSource && (
          <div
            className={cn("relative flex-shrink-0", "h-16")}
            style={{
              minWidth: '60px',
              maxWidth: '200px',
              height: '60px',
              minHeight: '60px'
            }}
          >
            <img
              src={logoSource}
              alt="Project Logo"
              className="w-full h-full object-contain rounded-md"
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
          {template.showProjectName && (
            <div
              className={cn(
                "w-full font-bold p-0 pr-6 text-lg whitespace-pre-wrap"
              )}
              style={{
                fontSize: '22px',
                lineHeight: '1.2',
                minHeight: '26px',
                backgroundColor: 'transparent'
              }}
            >
              {project.projectName || 'Project Name'}
            </div>
          )}

          {template.showProjectInfo && (
            <div
              className={cn(
                "w-full p-0 mt-1 pr-6 text-xs whitespace-pre-wrap"
              )}
              style={{
                fontSize: '14px',
                lineHeight: '1.4',
                minHeight: '20px',
                marginTop: '4px',
                backgroundColor: 'transparent',
                color: theme.header.text
              }}
            >
              {project.projectInfo || 'Project Info'}
            </div>
          )}
          {showLowerMetadataRow && !template.showProjectInfo && (
            <div
              aria-hidden="true"
              className={cn(
                "w-full p-0 mt-1 pr-6 text-xs whitespace-pre-wrap invisible pointer-events-none"
              )}
              style={{
                fontSize: '14px',
                lineHeight: '1.4',
                minHeight: '20px',
                marginTop: '4px',
                backgroundColor: 'transparent'
              }}
            />
          )}
        </div>
      </div>

      <div
        className="flex-shrink-0 text-right"
        style={{
          width: '250px',
          flexShrink: 0
        }}
      >
        {template.showClientAgency && (
          <div
            className={cn(
              "w-full font-semibold p-0 text-right pl-6 text-base whitespace-pre-wrap"
            )}
            style={{
              fontSize: '18px',
              lineHeight: '1.2',
              minHeight: '22px',
              backgroundColor: 'transparent'
            }}
          >
            {project.clientAgency || 'Client/Agency'}
          </div>
        )}

        {template.showJobInfo && (
          <div
            className={cn(
              "w-full p-0 mt-1 text-right pl-6 text-xs whitespace-pre-wrap"
            )}
            style={{
              fontSize: '14px',
              lineHeight: '1.4',
              minHeight: '20px',
              marginTop: '4px',
              backgroundColor: 'transparent',
              color: theme.header.text
            }}
          >
            {project.jobInfo || 'Job Info'}
          </div>
        )}
        {showLowerMetadataRow && !template.showJobInfo && (
          <div
            aria-hidden="true"
            className={cn(
              "w-full p-0 mt-1 text-right pl-6 text-xs whitespace-pre-wrap invisible pointer-events-none"
            )}
            style={{
              fontSize: '14px',
              lineHeight: '1.4',
              minHeight: '20px',
              marginTop: '4px',
              backgroundColor: 'transparent'
            }}
          />
        )}
      </div>
    </div>
  );
};

export const MasterHeader: React.FC<MasterHeaderProps> = ({ readOnly = false, exportPayload, gridCols }) => {
  if (exportPayload) {
    return <ExportMasterHeader exportPayload={exportPayload} gridCols={gridCols} />;
  }

  return <ConnectedMasterHeader readOnly={readOnly} gridCols={gridCols} />;
};