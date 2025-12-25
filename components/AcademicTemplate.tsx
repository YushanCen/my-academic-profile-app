
import React from 'react';
import { AcademicProfile, ThemeType, SectionBlock, EditableItem, ElementStyle, InlineLink } from '../types';

interface AcademicTemplateProps {
  data: AcademicProfile;
  activePageId: string;
  setActivePageId: (id: string) => void;
  theme: ThemeType;
  primaryColor: string;
  onSelectElement: (el: { type: string; path: string[] }) => void;
  searchQuery?: string;
}

const AcademicTemplate: React.FC<AcademicTemplateProps> = ({ 
  data, activePageId, setActivePageId, theme, primaryColor, onSelectElement, searchQuery 
}) => {
  const activePage = data.pages.find(p => p.id === activePageId) || data.pages[0];
  const themeColors = data.themeSettings?.[theme] || {};

  const getStyle = (style?: ElementStyle): React.CSSProperties => {
    if (!style) return { whiteSpace: 'pre-wrap' };
    const families: Record<string, string> = {
      'sans': 'Inter, sans-serif',
      'serif': 'Lora, serif',
      'times': '"Times New Roman", Times, serif',
      'georgia': 'Georgia, serif',
      'mono': 'JetBrains Mono, monospace'
    };
    return {
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      textDecoration: style.textDecoration,
      color: style.color,
      fontFamily: style.fontFamily ? families[style.fontFamily] : 'inherit',
      textAlign: style.textAlign,
      opacity: style.opacity,
      transform: style.scale ? `scale(${style.scale})` : undefined,
      width: style.width,
      height: style.height,
      whiteSpace: 'pre-wrap'
    };
  };

  const ClickWrapper: React.FC<React.PropsWithChildren<{ path: string[], type: string, className?: string }>> = ({ children, path, type, className }) => (
    <div 
      onClick={(e) => { 
        e.stopPropagation(); 
        e.preventDefault(); 
        onSelectElement({ type, path }); 
      }}
      className={`relative group cursor-pointer rounded-lg transition-all ${className} hover:ring-4 hover:ring-[#9B89B3]/20`}
    >
      {children}
      <div className="absolute -top-4 right-0 bg-[#9B89B3] text-white text-[9px] px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 uppercase font-black z-[100] shadow-lg tracking-wider transform translate-y-[-50%] pointer-events-none">
        EDIT
      </div>
    </div>
  );

  const renderTextWithLinks = (text: any = '', links: InlineLink[] = []) => {
    const safeText = text ? String(text) : '';
    if (!links || links.length === 0) return highlightText(safeText);

    let segments: { text: string; link?: InlineLink }[] = [{ text: safeText }];

    links.forEach((link: InlineLink) => {
      if (!link.matchText) return;
      
      let nextSegments: typeof segments = [];
      segments.forEach(seg => {
        if (seg.link) {
          nextSegments.push(seg);
          return;
        }
        
        try {
          const escapedMatch = link.matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${escapedMatch})`, 'gi');
          const parts = seg.text.split(regex);
          parts.forEach(p => {
            if (p && link.matchText && p.toLowerCase() === link.matchText.toLowerCase()) {
              nextSegments.push({ text: p, link });
            } else if (p) {
              nextSegments.push({ text: p });
            }
          });
        } catch (e) {
          nextSegments.push(seg);
        }
      });
      segments = nextSegments;
    });

    return segments.map((seg, i) => {
      if (!seg.link) return <React.Fragment key={i}>{highlightText(seg.text)}</React.Fragment>;
      
      const link = seg.link;
      const combinedStyle = { ...getStyle(link.style) };
      const content = <span style={combinedStyle}>{highlightText(seg.text)}</span>;
      
      if (link.linkType === 'none' || !link.linkType) {
        return <span key={i} style={combinedStyle}>{highlightText(seg.text)}</span>;
      }

      return (
        <a 
          key={i} 
          href={link.url || '#'} 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (link.linkType === 'internal' && link.internalPageId) {
              setActivePageId(link.internalPageId);
            } else if (link.url && link.url !== '#') {
              window.open(link.url, '_blank', 'noopener,noreferrer');
            }
          }}
          className="underline decoration-1 underline-offset-4 hover:opacity-70 transition-opacity" 
          style={{ color: link.style?.color || primaryColor }}
        >
          {content}
        </a>
      );
    });
  };

  const highlightText = (text: any = '') => {
    const safeText = text ? String(text) : '';
    const safeQuery = searchQuery ? String(searchQuery) : '';
    
    if (!safeQuery || !safeText.toLowerCase().includes(safeQuery.toLowerCase())) return safeText;
    
    try {
      const escapedQuery = safeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = safeText.split(new RegExp(`(${escapedQuery})`, 'gi'));
      return (
        <>
          {parts.map((part, i) => 
            part && part.toLowerCase() === safeQuery.toLowerCase() 
              ? <mark key={i} className="bg-yellow-200 text-black px-1 rounded">{part}</mark> 
              : part
          )}
        </>
      );
    } catch (e) {
      return safeText;
    }
  };

  const getIcon = (item: EditableItem) => {
    if (item?.image) return <img src={item.image} className="w-full h-full object-cover rounded-lg" alt="icon" />;
    if (item?.icon === 'custom' && item?.customIcon) return <img src={item.customIcon} className="w-full h-full object-contain" alt="icon" />;
    
    const iconSize = "w-full h-full p-0.5";
    
    switch (item?.icon) {
      case 'github': return <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>;
      case 'email': return (
        <svg className={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      );
      case 'scholar': return (
        <svg className={iconSize} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L1 7l11 5 9-4.09V17h2V7L12 2zm0 18c-3.31 0-6-2.69-6-6 0-1.34.45-2.58 1.21-3.57L12 13.1l4.79-2.67c.76.99 1.21 2.23 1.21 3.57 0 3.31-2.69-6-6 6z"/>
        </svg>
      );
      case 'orcid': return (
        <div className="w-full h-full bg-[#A6CE39] rounded-full flex items-center justify-center p-0.5">
          <svg viewBox="0 0 256 256" className="w-full h-full fill-white">
            <path d="M256,128c0,70.69-57.31,128-128,128S0,198.69,0,128S57.31,0,128,0,256,57.31,256,128z M71.94,189.26h20.17v-84.3H71.94 V189.26z M82.02,94.94c7.47,0,13.54-6.07,13.54-13.54S89.49,67.86,82.02,67.86S68.48,73.93,68.48,81.4S74.55,94.94,82.02,94.94z M107.03,189.26h40.35c34.1,0,46.5-24.18,46.5-42.15c0-30.83-22.18-42.15-46.5-42.15h-40.35V189.26z M127.2,172.11v-50h14.71 c22.42,0,32.32,12.72,32.32,25.01c0,16.51-12.35,25.01-32.32,25.01H127.2z" />
          </svg>
        </div>
      );
      case 'location': return (
        <svg className={iconSize} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      );
      default: return null;
    }
  };

  const getThemeClass = () => {
    const base = "w-full transition-all duration-700 min-h-[85vh] ";
    switch (theme) {
      case 'theme-1': return base + "bg-white p-24 rounded-[80px] shadow-2xl border-t-[12px]";
      case 'theme-2': return base + "bg-white p-20 border border-slate-100 shadow-none font-serif";
      case 'theme-3': return base + "bg-[#f8f9fa] p-24 border-l-[32px]";
      case 'theme-4': return base + "bg-slate-50 p-16 rounded-[48px] shadow-sm";
      case 'theme-5': return base + "bg-white p-24 border-x-[1px] border-slate-200 max-w-7xl mx-auto shadow-sm";
      case 'theme-6': return base + "bg-[#fffcf9] p-20 shadow-sm border-t-[8px]";
      case 'theme-7': return base + "bg-[#fdfbf7] p-24 font-serif text-slate-900";
      case 'theme-8': 
        return base + "bg-white p-12 md:p-20 shadow-sm rounded-none font-sans border-t-[20px]";
      default: return base + "bg-white p-24";
    }
  };

  const getHeaderClass = () => {
    const baseClass = "mb-32 flex flex-col items-start gap-8 ";
    switch(theme) {
      case 'theme-1': return baseClass + "pb-20 border-b-2 border-slate-100";
      case 'theme-2': return "mb-32 flex flex-col items-center text-center gap-12 pb-20 border-b border-slate-100";
      case 'theme-3': return "mb-32 bg-white p-12 -mx-24 -mt-24 shadow-sm flex flex-col gap-10 items-start";
      case 'theme-4': return "mb-20 flex flex-col gap-10 items-start bg-white/80 backdrop-blur p-8 rounded-3xl shadow-sm sticky top-0 z-50";
      case 'theme-5': return "mb-32 flex flex-col items-start gap-12 pb-20 border-b-[6px] border-slate-900";
      case 'theme-6': return "mb-32 flex flex-col gap-10 items-start pb-12 border-b-2 border-slate-900";
      case 'theme-7': return "mb-32 flex flex-col gap-16 border-l-[1px] border-slate-900 pl-12";
      case 'theme-8': return "mb-32 flex flex-col justify-between items-start gap-12 pb-16 border-b border-slate-100";
      default: return "mb-32 flex flex-col gap-12 items-start";
    }
  };

  const SectionHeader: React.FC<{ title: EditableItem, path: string[] }> = ({ title, path }) => {
    let headerStyle = "text-2xl font-black mb-8 tracking-tighter flex items-center gap-4 ";
    
    if (theme === 'theme-1') headerStyle += "border-b-4 border-slate-900 pb-2 uppercase text-slate-900";
    else if (theme === 'theme-2') headerStyle += "font-serif italic border-b border-slate-200 pb-1 text-3xl justify-center text-slate-800";
    else if (theme === 'theme-3') headerStyle += "bg-slate-800 text-white px-6 py-3 rounded-r-lg -ml-24 shadow-md w-fit";
    else if (theme === 'theme-4') headerStyle += "text-slate-900/40 uppercase tracking-[0.3em] text-xs font-black border-none";
    else if (theme === 'theme-5') headerStyle += "text-4xl font-serif text-slate-900 border-l-[12px] pl-6";
    else if (theme === 'theme-6') headerStyle += "bg-slate-100 text-slate-900 px-4 py-1 text-lg uppercase tracking-widest border-l-4 border-slate-900";
    else if (theme === 'theme-7') headerStyle += "text-5xl font-serif font-light italic border-b-[1px] border-slate-900/20 w-full pb-4";
    else if (theme === 'theme-8') headerStyle = "text-xs font-black uppercase tracking-[0.6em] text-slate-400 mb-10 w-full flex items-center gap-6 after:content-[''] after:h-[1px] after:flex-1 after:bg-slate-100";

    return (
      <ClickWrapper type="title" path={path}>
         <h2 className={headerStyle} style={getStyle(title?.style)}>
           {!['theme-1', 'theme-2', 'theme-3', 'theme-4', 'theme-5', 'theme-6', 'theme-7', 'theme-8'].includes(theme) && <span className="w-1.5 h-6 rounded-sm" style={{ backgroundColor: primaryColor }} />}
           {renderTextWithLinks(title.text, title.inlineLinks)}
         </h2>
      </ClickWrapper>
    );
  };

  const renderBlock = (block: SectionBlock, pIndex: number, bIndex: number) => {
    const path = ['pages', pIndex.toString(), 'layout', bIndex.toString()];
    const widthClass = block.layoutConfig?.width === 'narrow' ? 'max-w-3xl mx-auto' : block.layoutConfig?.width === 'medium' ? 'max-w-4xl mx-auto' : 'max-w-6xl mx-auto';
    
    switch (block.type) {
      case 'bio-hero':
        const bioItem = block.items[0];
        return (
          <div key={block.id} className={`${widthClass} flex flex-col lg:flex-row gap-16 items-start mb-28 ${theme === 'theme-1' ? 'p-10 border-l-[8px]' : theme === 'theme-2' ? 'p-0 text-center items-center' : theme === 'theme-3' ? 'p-8 bg-white shadow-sm' : theme === 'theme-5' ? 'border-y-[1px] py-16' : theme === 'theme-8' ? 'p-0' : 'p-0'}`} style={{ borderLeftColor: theme === 'theme-1' ? primaryColor : undefined, borderTopColor: theme === 'theme-6' ? primaryColor : undefined }}>
            <ClickWrapper type="photo" path={[...path, 'items', '0']} className="shrink-0">
               <img src={bioItem?.image} className={`w-64 h-80 object-cover shadow-2xl border p-1 bg-white ${theme === 'theme-4' ? 'rounded-[3rem]' : theme === 'theme-8' ? 'rounded-none border-b-[12px]' : 'rounded-2xl'}`} alt="photo" style={{ borderBottomColor: theme === 'theme-8' ? primaryColor : undefined }} />
            </ClickWrapper>
            <div className={`flex-1 space-y-6 ${theme === 'theme-2' ? 'items-center' : ''}`}>
              <ClickWrapper type="text" path={[...path, 'title']}>
                <h1 className={`${theme === 'theme-1' ? 'text-4xl' : theme === 'theme-2' ? 'text-5xl font-serif italic' : theme === 'theme-5' ? 'text-6xl font-serif' : theme === 'theme-8' ? 'text-6xl font-black tracking-tighter leading-[1.05]' : 'text-3xl'} tracking-tight text-slate-900`} style={{ ...getStyle(block.title.style), fontWeight: block.title.style?.fontWeight || 'bold' }}>{renderTextWithLinks(block.title.text, block.title.inlineLinks)}</h1>
              </ClickWrapper>
              <ClickWrapper type="bio" path={[...path, 'items', '0']}>
                <div className="space-y-4">
                  <div className={`text-lg leading-relaxed text-slate-700 ${theme === 'theme-2' || theme === 'theme-7' ? 'font-serif' : ''} ${theme === 'theme-8' ? 'text-xl opacity-60 leading-relaxed border-l-[3px] pl-6' : ''}`} style={{ ...getStyle(bioItem?.style), borderLeftColor: theme === 'theme-8' ? primaryColor : undefined, whiteSpace: 'pre-wrap' }}>
                    {renderTextWithLinks(bioItem?.text, bioItem?.inlineLinks)}
                  </div>
                  {bioItem?.subtext && (
                    <div className={`text-base leading-relaxed text-slate-500 italic opacity-80 ${theme === 'theme-8' ? 'pl-6' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>
                      {renderTextWithLinks(bioItem.subtext, bioItem.inlineLinks)}
                    </div>
                  )}
                </div>
              </ClickWrapper>
            </div>
          </div>
        );

      case 'group-photo':
        return (
          <div key={block.id} className={`${widthClass} mb-28`}>
            <SectionHeader title={block.title} path={[...path, 'title']} />
            <div className={`grid grid-cols-1 md:grid-cols-${block.layoutConfig?.columns || 1} gap-8`}>
              {block.items.map((item, i) => (
                <div key={item.id} className="flex flex-col group/item">
                  <ClickWrapper type="photo" path={[...path, 'items', i.toString()]} className="w-full overflow-hidden rounded-[2rem] shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300">
                    <img 
                      src={item.image} 
                      className="w-full object-cover" 
                      style={{ 
                        height: item.style?.height || 'auto',
                        aspectRatio: item.style?.height ? 'auto' : (block.layoutConfig?.aspectRatio || '16/9')
                      }} 
                      alt="Research" 
                    />
                  </ClickWrapper>
                  {(item.text || item.subtext) && (
                    <ClickWrapper type="item" path={[...path, 'items', i.toString()]}>
                      <div className="mt-6 text-center px-4 max-w-2xl mx-auto">
                        {item.text && (
                          <div className={`text-slate-800 font-bold ${block.layoutConfig?.columns === 1 ? 'text-2xl' : 'text-lg'}`} style={getStyle(item.style)}>
                            {renderTextWithLinks(item.text, item.inlineLinks)}
                          </div>
                        )}
                        {item.subtext && (
                          <p className="text-slate-500 text-sm mt-2 italic leading-relaxed">
                            {renderTextWithLinks(item.subtext, item.inlineLinks)}
                          </p>
                        )}
                      </div>
                    </ClickWrapper>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'lab-team':
        return (
          <div key={block.id} className={`${widthClass} mb-28`}>
            <SectionHeader title={block.title} path={[...path, 'title']} />
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-stretch`}>
              {block.items.map((item, i) => (
                <ClickWrapper key={item.id} type="member" path={[...path, 'items', i.toString()]} className="h-full">
                  <div className={`flex flex-row items-center gap-6 p-4 md:p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow h-full`}>
                    {item.image && (
                      <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-2xl overflow-hidden shadow-inner border border-slate-50">
                        <img src={item.image} className="w-full h-full object-cover" alt={item.text} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`text-lg md:text-xl font-bold text-slate-800 leading-tight`} style={getStyle(item.style)}>
                        {renderTextWithLinks(item.text, item.inlineLinks)}
                      </div>
                      {item.subtext && (
                        <div className="text-sm md:text-base text-slate-500 mt-2 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                          {renderTextWithLinks(item.subtext, item.inlineLinks)}
                        </div>
                      )}
                    </div>
                  </div>
                </ClickWrapper>
              ))}
            </div>
          </div>
        );

      case 'contact-grid':
        return (
          <div key={block.id} className={`${widthClass} mb-28`}>
            <SectionHeader title={block.title} path={[...path, 'title']} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {block.items.map((item, i) => (
                <ClickWrapper key={item.id} type="item" path={[...path, 'items', i.toString()]} className="h-full">
                  <div className={`p-6 border flex flex-col items-center text-center gap-4 transition-all h-full ${theme === 'theme-4' ? 'bg-white rounded-[2rem] shadow-sm border-none hover:translate-y-[-4px]' : theme === 'theme-8' ? 'bg-slate-50 border-transparent rounded-none hover:bg-white hover:shadow-2xl' : 'bg-white border-slate-100 rounded-[32px] shadow-sm'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ${theme === 'theme-8' ? 'bg-white text-slate-900' : 'bg-slate-50 text-slate-600'} border border-slate-50 transition-colors`} style={{borderColor: theme === 'theme-8' ? undefined : primaryColor + '40', borderTopColor: theme === 'theme-8' ? primaryColor : undefined, borderTopWidth: theme === 'theme-8' ? '3px' : undefined}}>
                      {getIcon(item)}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${theme === 'theme-8' ? 'text-slate-400' : 'text-slate-400'}`}>{renderTextWithLinks(item.text, item.inlineLinks)}</p>
                      <p className={`text-sm font-bold break-words leading-tight ${theme === 'theme-8' ? 'text-slate-800' : 'text-slate-800'}`} style={{ ...getStyle(item.style), whiteSpace: 'pre-wrap' }}>{renderTextWithLinks(item.subtext, item.inlineLinks)}</p>
                    </div>
                  </div>
                </ClickWrapper>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div key={block.id} className={`${widthClass} mb-28`}>
            <SectionHeader title={block.title} path={[...path, 'title']} />
            <div className={`grid grid-cols-1 md:grid-cols-${block.layoutConfig?.columns || 1} gap-10`}>
              {block.items.map((item, i) => (
                <ClickWrapper key={item.id} type="item" path={[...path, 'items', i.toString()]}>
                  <div className={`flex flex-col md:flex-row gap-6 md:gap-16 group pb-10 border-b last:border-0 items-start ${theme === 'theme-3' ? 'p-8 bg-white mb-4 border-none shadow-sm rounded-lg' : theme === 'theme-8' ? 'border-slate-50 hover:translate-x-3 transition-transform duration-300' : 'border-slate-100'}`}>
                    {item.date && <div className={`w-20 shrink-0 font-black text-xl ${theme === 'theme-1' ? 'text-slate-900 border-r-4' : theme === 'theme-8' ? 'text-slate-900 border-l-[5px] pl-4 h-fit' : 'text-slate-300'}`} style={{ borderRightColor: theme === 'theme-1' ? primaryColor : undefined, borderLeftColor: theme === 'theme-8' ? primaryColor : undefined }}>{item.date}</div>}
                    
                    {item.image && (
                       <div className={`w-32 h-32 shrink-0 overflow-hidden ${theme === 'theme-4' ? 'rounded-3xl' : 'rounded-xl'} shadow-lg border border-slate-100`}>
                          <img src={item.image} className="w-full h-full object-cover" alt="item thumbnail" />
                       </div>
                    )}
                    
                    <div className="flex-1">
                      <div className={`text-xl text-slate-800 ${theme === 'theme-2' || theme === 'theme-7' ? 'font-serif text-2xl' : theme === 'theme-8' ? 'text-2xl tracking-tight' : ''}`} style={{ ...getStyle(item?.style), fontWeight: item?.style?.fontWeight || 'bold', whiteSpace: 'pre-wrap' }}>{renderTextWithLinks(item.text, item.inlineLinks)}</div>
                      {item?.subtext && <p className={`text-base mt-2 leading-relaxed ${theme === 'theme-8' ? 'text-slate-400 font-normal' : 'text-slate-500 font-medium'}`} style={{ ...getStyle(item?.style), fontSize: undefined, fontWeight: undefined, color: undefined, whiteSpace: 'pre-wrap' }}>{renderTextWithLinks(item.subtext, item.inlineLinks)}</p>}
                    </div>
                  </div>
                </ClickWrapper>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={getThemeClass()} style={{ backgroundColor: themeColors.backgroundColor || (theme === 'theme-8' ? '#ffffff' : undefined), borderTopColor: ['theme-1', 'theme-6', 'theme-8'].includes(theme) ? primaryColor : undefined, borderLeftColor: theme === 'theme-3' ? primaryColor : undefined }}>
      <header className={getHeaderClass()} style={{ borderBottomColor: theme === 'theme-5' ? primaryColor : undefined }}>
        <div className={`flex flex-col gap-10 w-full ${theme === 'theme-2' ? 'items-center' : 'items-start'}`}>
          <ClickWrapper type="name" path={['name']}>
            <h1 className={`text-7xl font-black tracking-tighter leading-none ${theme === 'theme-2' || theme === 'theme-7' ? 'font-serif italic text-6xl text-center' : theme === 'theme-5' ? 'font-serif text-5xl italic' : theme === 'theme-8' ? 'text-6xl tracking-[-0.05em] text-slate-900' : ''}`} style={getStyle(data.name?.style)}>
              {renderTextWithLinks(data.name.text, data.name.inlineLinks)}
            </h1>
          </ClickWrapper>
          <nav className={`flex flex-wrap ${theme === 'theme-2' ? 'justify-center' : 'justify-start'} ${['theme-2', 'theme-5', 'theme-7', 'theme-8'].includes(theme) ? 'gap-16' : 'gap-12'} w-full`}>
             {data.pages.map(p => (
               <button key={p.id} onClick={(e) => { e.preventDefault(); setActivePageId(p.id); }} className={`text-xs font-black uppercase tracking-[0.4em] transition-all relative group py-2`} style={{ color: activePageId === p.id ? primaryColor : 'inherit', opacity: activePageId === p.id ? 1 : 0.2 }}>
                 {p.title}
                 {activePageId === p.id && <div className={`absolute left-0 w-full rounded-full ${theme === 'theme-4' ? 'bottom-0 h-1' : theme === 'theme-8' ? 'bottom-0 h-1.5' : 'bottom-0 h-2'}`} style={{ backgroundColor: primaryColor }} />}
               </button>
             ))}
          </nav>
        </div>
      </header>
      <main>
        {activePage.layout.map((block, idx) => renderBlock(block, data.pages.indexOf(activePage), idx))}
      </main>
      <footer className={`mt-64 pt-24 border-t-2 text-center opacity-30 ${theme === 'theme-8' ? 'border-slate-50 text-slate-900' : 'border-slate-100 text-slate-900'}`}>
         <p className="text-[10px] font-black uppercase tracking-[0.5em] font-sans">SCHOLARLY ARCHIVE • {new Date().getFullYear()} {data.name?.text?.toUpperCase()}</p>
      </footer>
    </div>
  );
};

export default AcademicTemplate;
