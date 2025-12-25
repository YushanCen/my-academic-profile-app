import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { AcademicProfile, ThemeType, EditableItem, BlockType, SectionBlock, PageData, InlineLink } from './types';
import { INITIAL_DATA, ACADEMIC_PALETTES, FONTS, THEME_LIST } from './constants';
import AcademicTemplate from './components/AcademicTemplate';

const TECH_ICONS: EditableItem['icon'][] = [
  'none', 'email', 'scholar', 'github', 'orcid', 'weibo', 'zhihu', 'bilibili', 'twitter', 'location'
];

// Mock database of "taken" subdomains for conflict checking
const TAKEN_SUBDOMAINS = ['admin', 'google', 'root', 'scholar', 'portal', 'academic', 'test'];

// Extend window type for AIStudio specific APIs
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [profile, setProfile] = useState<AcademicProfile>(INITIAL_DATA);
  const [theme, setTheme] = useState<ThemeType>('theme-1');
  const [activePageId, setActivePageId] = useState<string>(profile.pages[0].id);
  const [primaryColor, setPrimaryColor] = useState<string>(ACADEMIC_PALETTES[0].colors[0].primary);
  const [editingElement, setEditingElement] = useState<{ type: string; path: string[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // History management
  const [history, setHistory] = useState<AcademicProfile[]>([INITIAL_DATA]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Publishing states
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishSubdomain, setPublishSubdomain] = useState(profile.subdomain);
  
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const genericFileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true); 
      } catch (err) {
        console.error("Failed to open key selector:", err);
      }
    }
  };

  const activePage = profile.pages.find(p => p.id === activePageId) || profile.pages[0];
  const allColors = useMemo(() => ACADEMIC_PALETTES.flatMap(g => g.colors), []);

  const pushToHistory = useCallback((newProfile: AcademicProfile) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newProfile);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => {
      const nextIndex = historyIndex + 1;
      return nextIndex > 50 ? 50 : nextIndex;
    });
    setProfile(newProfile);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setProfile(prev);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setProfile(next);
    }
  };

  const updateByPath = (path: string[], value: any) => {
    setProfile(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let current = next;
      for (let i = 0; i < path.length - 1; i++) {
        if (current[path[i]] === undefined) current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(next);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      return next;
    });
  };

  const updateMultipleByPath = (updates: {path: string[], value: any}[]) => {
    setProfile(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      updates.forEach(({path, value}) => {
        let current = next;
        for (let i = 0; i < path.length - 1; i++) {
          if (current[path[i]] === undefined) current[path[i]] = {};
          current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
      });
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(next);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      return next;
    });
  };

  const addItemToBlock = (blockPath: string[]) => {
    const next = JSON.parse(JSON.stringify(profile));
    let current = next;
    blockPath.forEach(key => current = current[key]);
    const block = current as SectionBlock;
    const newItem: EditableItem = {
      id: `i-${Date.now()}`,
      text: block.type === 'contact-grid' ? "PLATFORM" : "New Item",
      subtext: block.type === 'contact-grid' ? "Username/Link" : "Additional details",
      date: block.type === 'technical-skills' ? '' : "2024",
      icon: block.type === 'contact-grid' ? 'email' : 'none',
      image: ['group-photo', 'lab-team'].includes(block.type) ? 'https://via.placeholder.com/800x450.png?text=Image' : undefined
    };
    if (!block.items) block.items = [];
    block.items.push(newItem);
    pushToHistory(next);
  };

  const removeItemFromBlock = (itemPath: string[]) => {
    const parentPath = itemPath.slice(0, -1);
    const indexToRemove = parseInt(itemPath[itemPath.length - 1]);
    
    const next = JSON.parse(JSON.stringify(profile));
    let current = next;
    parentPath.forEach(key => current = current[key]);
    if (Array.isArray(current)) {
      current.splice(indexToRemove, 1);
    }
    pushToHistory(next);
    setEditingElement(null);
  };

  const addInlineLink = (path: string[]) => {
    let selectedText = '';
    if (contentTextareaRef.current) {
      const start = contentTextareaRef.current.selectionStart;
      const end = contentTextareaRef.current.selectionEnd;
      if (start !== end) {
        selectedText = contentTextareaRef.current.value.substring(start, end);
      }
    }

    const newLink: InlineLink = {
      id: `link-${Date.now()}`,
      matchText: selectedText || 'Text to match',
      url: '',
      linkType: 'none',
      style: {}
    };
    
    const next = JSON.parse(JSON.stringify(profile));
    let current = next;
    path.forEach(key => current = current[key]);
    if (!current.inlineLinks) current.inlineLinks = [];
    current.inlineLinks.push(newLink);
    pushToHistory(next);
  };

  const removeInlineLink = (path: string[], linkId: string) => {
    const next = JSON.parse(JSON.stringify(profile));
    let current = next;
    path.forEach(key => current = current[key]);
    current.inlineLinks = (current.inlineLinks || []).filter((l: InlineLink) => l.id !== linkId);
    pushToHistory(next);
  };

  const saveConfig = () => {
    const config = {
      profile,
      theme,
      primaryColor
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `academic-portal-config-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const imported = JSON.parse(content);
          if (imported.profile) {
            setProfile(imported.profile);
            setHistory([imported.profile]);
            setHistoryIndex(0);
          }
          if (imported.theme) setTheme(imported.theme);
          if (imported.primaryColor) setPrimaryColor(imported.primaryColor);
          if (imported.profile?.pages?.[0]?.id) setActivePageId(imported.profile.pages[0].id);
        } catch (err) {
          alert("Invalid configuration file.");
        }
      };
      reader.readAsText(file);
    }
  };

  // --- 导出逻辑：1:1 还原主题样式 ---
  const exportForGithub = () => {
    const siteData = { profile, theme, primaryColor };
    
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${profile.name.text} | Academic Homepage</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=JetBrains+Mono&display=swap" rel="stylesheet">
    
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['Inter', 'sans-serif'],
              serif: ['Lora', 'serif'],
              mono: ['JetBrains Mono', 'monospace'],
            }
          }
        }
      }
    </script>

    <style>
        body { background-color: #f8fafc; color: #0f172a; }
        .font-serif { font-family: 'Lora', serif !important; }
        .font-mono { font-family: 'JetBrains Mono', monospace !important; }
        .font-sans { font-family: 'Inter', sans-serif !important; }
        
        .content-text {
            white-space: pre-wrap !important;
            word-wrap: break-word;
        }

        .theme-container { transition: all 0.5s ease; }
        a { text-decoration: none; color: inherit; }
    </style>
</head>
<body class="antialiased text-slate-900">
    <div id="render-root"></div>
    <script type="module">
        const data = ${JSON.stringify(siteData)};
        const { profile, theme, primaryColor } = data;
        let activePageId = profile.pages[0].id;

        function render() {
            const root = document.getElementById('render-root');
            const activePage = profile.pages.find(p => p.id === activePageId) || profile.pages[0];
            const themeColors = profile.themeSettings?.[theme] || {};
            
            const families = {
              'sans': 'Inter, sans-serif',
              'serif': 'Lora, serif',
              'times': '"Times New Roman", Times, serif',
              'georgia': 'Georgia, serif',
              'mono': 'JetBrains Mono, monospace'
            };

            /* === 样式辅助函数 === */
            const getThemeClass = (t) => {
                const base = "w-full transition-all duration-700 min-h-[85vh] ";
                switch (t) {
                  case 'theme-1': return base + "bg-white p-24 rounded-[80px] shadow-2xl border-t-[12px]";
                  case 'theme-2': return base + "bg-white p-20 border border-slate-100 shadow-none font-serif";
                  case 'theme-3': return base + "bg-[#f8f9fa] p-24 border-l-[32px]";
                  case 'theme-4': return base + "bg-slate-50 p-16 rounded-[48px] shadow-sm";
                  case 'theme-5': return base + "bg-white p-24 border-x-[1px] border-slate-200 max-w-7xl mx-auto shadow-sm";
                  case 'theme-6': return base + "bg-[#fffcf9] p-20 shadow-sm border-t-[8px]";
                  case 'theme-7': return base + "bg-[#fdfbf7] p-24 font-serif text-slate-900";
                  case 'theme-8': return base + "bg-white p-12 md:p-20 shadow-sm rounded-none font-sans border-t-[20px]";
                  default: return base + "bg-white p-24";
                }
            };

            const getHeaderClass = (t) => {
                const baseClass = "mb-32 flex flex-col gap-8 ";
                switch(t) {
                  case 'theme-1': return baseClass + "items-start pb-20 border-b-2 border-slate-100";
                  case 'theme-2': return "mb-32 flex flex-col items-center text-center gap-12 pb-20 border-b border-slate-100";
                  case 'theme-3': return "mb-32 bg-white p-12 -mx-24 -mt-24 shadow-sm flex flex-col gap-10 items-start";
                  case 'theme-4': return "mb-20 flex flex-col gap-10 items-start bg-white/80 backdrop-blur p-8 rounded-3xl shadow-sm sticky top-0 z-50";
                  case 'theme-5': return "mb-32 flex flex-col items-start gap-12 pb-20 border-b-[6px] border-slate-900";
                  case 'theme-6': return "mb-32 flex flex-col gap-10 items-start pb-12 border-b-2 border-slate-900";
                  case 'theme-7': return "mb-32 flex flex-col gap-16 border-l-[1px] border-slate-900 pl-12 items-start";
                  case 'theme-8': return "mb-32 flex flex-col justify-between items-start gap-12 pb-16 border-b border-slate-100";
                  default: return "mb-32 flex flex-col gap-12 items-start";
                }
            };

            /* 1:1 还原 AcademicTemplate 的标题样式逻辑 */
            const getSectionHeaderStyle = (t) => {
                let s = "text-2xl font-black mb-8 tracking-tighter flex items-center gap-4 ";
                if (t === 'theme-1') s += "border-b-4 border-slate-900 pb-2 uppercase text-slate-900";
                else if (t === 'theme-2') s += "font-serif italic border-b border-slate-200 pb-1 text-3xl justify-center text-slate-800";
                else if (t === 'theme-3') s += "bg-slate-800 text-white px-6 py-3 rounded-r-lg -ml-24 shadow-md w-fit";
                else if (t === 'theme-4') s += "text-slate-900/40 uppercase tracking-[0.3em] text-xs font-black border-none";
                else if (t === 'theme-5') s += "text-4xl font-serif text-slate-900 border-l-[12px] pl-6";
                else if (t === 'theme-6') s += "bg-slate-100 text-slate-900 px-4 py-1 text-lg uppercase tracking-widest border-l-4 border-slate-900";
                else if (t === 'theme-7') s += "text-5xl font-serif font-light italic border-b-[1px] border-slate-900/20 w-full pb-4";
                else if (t === 'theme-8') s = "text-xs font-black uppercase tracking-[0.6em] text-slate-400 mb-10 w-full flex items-center gap-6 after:content-[''] after:h-[1px] after:flex-1 after:bg-slate-100";
                return s;
            };

            const getStyleAttr = (s) => {
              if(!s) return 'style="white-space: pre-wrap;"';
              let styleStr = 'style="white-space: pre-wrap; ';
              if(s.fontSize) styleStr += \`font-size: \${String(s.fontSize).match(/^\\d+$/) ? s.fontSize + 'px' : s.fontSize};\`;
              if(s.fontWeight) styleStr += \`font-weight: \${s.fontWeight};\`;
              if(s.fontStyle) styleStr += \`font-style: \${s.fontStyle};\`; 
              if(s.color) styleStr += \`color: \${s.color};\`;
              if(s.fontFamily && families[s.fontFamily]) styleStr += \`font-family: \${families[s.fontFamily]};\`;
              if(s.lineHeight) styleStr += \`line-height: \${String(s.lineHeight).match(/^\\d+$/) && Number(s.lineHeight) > 4 ? s.lineHeight + 'px' : s.lineHeight};\`;
              styleStr += '"';
              return styleStr;
            };

            const getIconSvg = (name) => {
                const iconSize = "w-full h-full p-0.5";
                const icons = {
                    github: \`<svg class="\${iconSize}" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>\`,
                    email: \`<svg class="\${iconSize}" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>\`,
                    scholar: \`<svg class="\${iconSize}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 7l11 5 9-4.09V17h2V7L12 2zm0 18c-3.31 0-6-2.69-6-6 0-1.34.45-2.58 1.21-3.57L12 13.1l4.79-2.67c.76.99 1.21 2.23 1.21 3.57 0 3.31-2.69-6-6 6z"/></svg>\`,
                    orcid: \`<div class="w-full h-full bg-[#A6CE39] rounded-full flex items-center justify-center p-0.5"><svg viewBox="0 0 256 256" class="w-full h-full fill-white"><path d="M256,128c0,70.69-57.31,128-128,128S0,198.69,0,128S57.31,0,128,0,256,57.31,256,128z M71.94,189.26h20.17v-84.3H71.94 V189.26z M82.02,94.94c7.47,0,13.54-6.07,13.54-13.54S89.49,67.86,82.02,67.86S68.48,73.93,68.48,81.4S74.55,94.94,82.02,94.94z M107.03,189.26h40.35c34.1,0,46.5-24.18,46.5-42.15c0-30.83-22.18-42.15-46.5-42.15h-40.35V189.26z M127.2,172.11v-50h14.71 c22.42,0,32.32,12.72,32.32,25.01c0,16.51-12.35,25.01-32.32,25.01H127.2z" /></svg></div>\`,
                    location: \`<svg class="\${iconSize}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>\`
                };
                return icons[name] || '<span class="text-[8px] font-black uppercase">' + name.substring(0,4) + '</span>';
            };

            const processText = (text, links) => {
                const safeText = text ? String(text) : '';
                if (!links || links.length === 0) return safeText;

                let segments = [{ text: safeText }];

                links.forEach(link => {
                    if (!link.matchText) return;
                    let nextSegments = [];
                    segments.forEach(seg => {
                        if (seg.link) {
                            nextSegments.push(seg);
                            return;
                        }
                        try {
                            const escapedMatch = link.matchText.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
                            const regex = new RegExp(\`(\${escapedMatch})\`, 'gi');
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

                return segments.map(seg => {
                    if (!seg.link) return \`<span class="content-text">\${seg.text}</span>\`;
                    
                    const link = seg.link;
                    const rawStyle = getStyleAttr(link.style).replace('style="', '').replace('"', '');
                    let href = link.url || '#';
                    let onClick = '';
                    
                    const isRealLink = (link.url && link.url !== '#') || (link.linkType === 'internal' && link.internalPageId);
                    
                    if (link.linkType === 'internal' && link.internalPageId) {
                         href = '#';
                         onClick = \`onclick="window.switchPage('\${link.internalPageId}'); return false;"\`;
                    }
                    
                    const baseColor = link.style?.color || primaryColor;
                    const decoration = isRealLink ? 'text-decoration: underline; text-underline-offset: 4px;' : 'text-decoration: none;';
                    const finalStyle = \`style="color: \${baseColor}; \${decoration} \${rawStyle}"\`;
                    
                    if (!isRealLink) {
                        return \`<span \${finalStyle}>\${seg.text}</span>\`;
                    }
                    
                    return \`<a href="\${href}" \${onClick} class="hover:opacity-70 transition-opacity" \${finalStyle}>\${seg.text}</a>\`;
                }).join('');
            };

            const renderBlock = (block) => {
                let content = '';
                const widthClass = block.layoutConfig?.width === 'narrow' ? 'max-w-3xl' : block.layoutConfig?.width === 'medium' ? 'max-w-4xl' : 'max-w-6xl';
                const sectionHeaderClass = getSectionHeaderStyle(theme);
                
                if (block.type === 'bio-hero') {
                    // 动态调整 Bio 部分的字体和排版
                    const bioTitleClass = theme === 'theme-1' ? 'text-4xl' : theme === 'theme-2' ? 'text-5xl font-serif italic' : theme === 'theme-5' ? 'text-6xl font-serif' : theme === 'theme-8' ? 'text-6xl font-black tracking-tighter leading-[1.05]' : 'text-3xl';
                    const bioBodyClass = theme === 'theme-2' || theme === 'theme-7' ? 'font-serif' : '';
                    
                    content = \`
                        <div class="flex flex-col lg:flex-row gap-16 items-start mb-28 \${theme === 'theme-1' ? 'p-10 border-l-[8px]' : theme === 'theme-2' ? 'p-0 text-center items-center' : theme === 'theme-3' ? 'p-8 bg-white shadow-sm' : ''}" style="\${theme === 'theme-1' ? 'border-left-color:' + primaryColor : ''}">
                            <img src="\${block.items[0]?.image}" class="w-64 h-80 object-cover shadow-xl border border-slate-100 p-1 bg-white \${theme === 'theme-4' ? 'rounded-[3rem]' : 'rounded-2xl'}">
                            <div class="flex-1 space-y-6">
                                <h1 class="\${bioTitleClass} tracking-tight text-slate-900 content-text" \${getStyleAttr(block.title.style)}>\${processText(block.title.text, block.title.inlineLinks)}</h1>
                                <div class="text-lg leading-relaxed text-slate-700 font-medium content-text \${bioBodyClass}" \${getStyleAttr(block.items[0]?.style)}>\${processText(block.items[0]?.text, block.items[0]?.inlineLinks)}</div>
                                \${block.items[0]?.subtext ? \`<div class="text-base text-slate-500 italic opacity-80 content-text" style="">\${processText(block.items[0]?.subtext, block.items[0]?.inlineLinks)}</div>\` : ''}
                            </div>
                        </div>\`;
                } else if (block.type === 'contact-grid') {
                    content = \`
                        <div class="mb-28">
                            <h2 class="\${sectionHeaderClass}">
                                \${!['theme-1', 'theme-2', 'theme-3', 'theme-4', 'theme-5', 'theme-6', 'theme-7', 'theme-8'].includes(theme) ? \`<span class="w-1.5 h-6 rounded-sm" style="background-color: \${primaryColor}"></span>\` : ''}
                                \${processText(block.title.text, block.title.inlineLinks)}
                            </h2>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                \${block.items.map(item => \`
                                    <div class="p-6 bg-white border border-slate-100 rounded-[32px] flex flex-col items-center text-center gap-4 shadow-sm">
                                        <div class="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-50 p-2.5" style="border-color: \${primaryColor}40">
                                            <div class="w-full h-full text-slate-600 font-black text-[10px]">
                                              \${item.icon === 'custom' && item.customIcon ? \`<img src="\${item.customIcon}" class="w-full h-full object-contain">\` : getIconSvg(item.icon)}
                                            </div>
                                        </div>
                                        <div>
                                            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">\${processText(item.text, item.inlineLinks)}</p>
                                            <p class="text-sm font-bold text-slate-800 break-all content-text" \${getStyleAttr(item.style)}>\${processText(item.subtext, item.inlineLinks)}</p>
                                        </div>
                                    </div>
                                \`).join('')}
                            </div>
                        </div>\`;
                } else {
                    const listItemClass = theme === 'theme-2' || theme === 'theme-7' ? 'font-serif text-2xl' : theme === 'theme-8' ? 'text-2xl tracking-tight' : 'text-xl font-bold';
                    content = \`
                        <div class="mb-28">
                            <h2 class="\${sectionHeaderClass}">
                                \${!['theme-1', 'theme-2', 'theme-3', 'theme-4', 'theme-5', 'theme-6', 'theme-7', 'theme-8'].includes(theme) ? \`<span class="w-1.5 h-6 rounded-sm" style="background-color: \${primaryColor}"></span>\` : ''}
                                \${processText(block.title.text, block.title.inlineLinks)}
                            </h2>
                            <div class="space-y-10">
                                \${block.items.map(item => \`
                                    <div class="pb-10 border-b border-slate-100 flex flex-col md:flex-row gap-6 md:gap-16 last:border-0 \${theme === 'theme-3' ? 'p-8 bg-white mb-4 border-none shadow-sm rounded-lg' : ''}">
                                        \${item.date ? \`<div class="w-20 shrink-0 font-black text-slate-300 text-xl">\${item.date}</div>\` : ''}
                                        \${item.image ? \`<div class="w-32 h-32 shrink-0"><img src="\${item.image}" class="w-full h-full object-cover rounded-xl shadow-md"></div>\` : ''}
                                        <div class="flex-1">
                                            <div class="\${listItemClass} text-slate-800 content-text" \${getStyleAttr(item.style)}>\${processText(item.text, item.inlineLinks)}</div>
                                            <p class="text-base text-slate-500 mt-2 leading-relaxed font-medium content-text" style="">\${processText(item.subtext || '', item.inlineLinks)}</p>
                                        </div>
                                    </div>
                                \`).join('')}
                            </div>
                        </div>\`;
                }
                return \`<div class="\${widthClass} mx-auto">\${content}</div>\`;
            };

            const pageContent = activePage.layout.map(renderBlock).join('');
            
            root.innerHTML = \`
                <div class="p-12 md:p-24 bg-white min-h-screen">
                    <div class="max-w-6xl mx-auto \${getThemeClass(theme)} theme-container">
                        <header class="\${getHeaderClass(theme)}">
                            <div class="flex flex-col gap-10 w-full \${theme === 'theme-2' ? 'items-center' : 'items-start'}">
                                <h1 class="text-7xl font-black tracking-tighter leading-none content-text \${theme === 'theme-2' || theme === 'theme-7' ? 'font-serif italic text-6xl text-center' : theme === 'theme-5' ? 'font-serif text-5xl italic' : ''}" \${getStyleAttr(profile.name.style)}>\${processText(profile.name.text, profile.name.inlineLinks)}</h1>
                                <nav class="flex flex-wrap \${theme === 'theme-2' ? 'justify-center' : 'justify-start'} \${['theme-2', 'theme-5', 'theme-7', 'theme-8'].includes(theme) ? 'gap-16' : 'gap-12'} w-full">
                                    \${profile.pages.map(p => \`
                                        <button onclick="window.switchPage('\${p.id}')" class="text-xs font-black uppercase tracking-[0.4em] transition-all relative py-2 \${p.id === activePageId ? '' : 'opacity-20 hover:opacity-100'}" style="color: \${p.id === activePageId ? primaryColor : 'inherit'}">
                                            \${p.title}
                                            \${p.id === activePageId ? \`<div class="absolute bottom-0 left-0 w-full rounded-full \${theme === 'theme-4' ? 'h-1' : 'h-2'}" style="background-color: \${primaryColor}"></div>\` : ''}
                                        </button>
                                    \`).join('')}
                                </nav>
                            </div>
                        </header>
                        <main>\${pageContent}</main>
                        <footer class="mt-64 pt-24 border-t-2 border-slate-100 text-center opacity-30">
                            <p class="text-[10px] font-black uppercase tracking-[0.5em]">\${new Date().getFullYear()} \${profile.name.text.toUpperCase()}</p>
                        </footer>
                    </div>
                </div>\`;
        }

        window.switchPage = (id) => {
            activePageId = id;
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        render();
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'index.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsPublishDialogOpen(false);
  };
  // -----------------------------------------------------

  const addPage = () => {
    const newPage: PageData = { id: `p-${Date.now()}`, title: 'New Page', layout: [] };
    const next = { ...profile, pages: [...profile.pages, newPage] };
    pushToHistory(next);
    setActivePageId(newPage.id);
  };

  const deletePage = (id: string) => {
    if (profile.pages.length <= 1) return;
    const next = { ...profile, pages: profile.pages.filter(p => p.id !== id) };
    pushToHistory(next);
    if (activePageId === id) setActivePageId(profile.pages[0].id);
  };

  const addBlock = (type: BlockType) => {
    const pageIndex = profile.pages.findIndex(p => p.id === activePageId);
    if (pageIndex === -1) return;
    const newBlock: SectionBlock = {
      id: `b-${Date.now()}`,
      type,
      title: { id: `t-${Date.now()}`, text: type.toUpperCase().replace('-', ' ') },
      items: [],
      layoutConfig: { width: 'wide', columns: 1 }
    };

    switch(type) {
      case 'bio-hero':
        newBlock.title.text = "Principal Investigator";
        newBlock.items = [{ id: `i-${Date.now()}`, text: "Dedicated to research in...", image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800" }];
        break;
      case 'group-photo':
        newBlock.title.text = "Our Research Team";
        newBlock.layoutConfig!.width = 'full';
        newBlock.layoutConfig!.columns = 1;
        newBlock.items = [{ 
          id: `i-${Date.now()}`, 
          text: "The lab team at the annual symposium.", 
          subtext: "Summer 2024",
          image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200" 
        }];
        break;
      case 'group-summary':
        newBlock.title.text = "About the Laboratory";
        newBlock.items = [{ id: `i1`, text: "Our lab focuses on the intersection of human-computer interaction and artificial intelligence. We believe in collaborative research that pushes technical boundaries while considering human impact." }];
        break;
      case 'activities':
        newBlock.title.text = "Activities & Professional Service";
        newBlock.items = [
          { id: `i1`, text: "Invited Talk: Future of AI", subtext: "Global Tech Summit 2024", date: "2024" },
          { id: `i2`, text: "Fellowship: Outstanding Researcher", subtext: "Academic Society of Science", date: "2023" }
        ];
        break;
      case 'education-employment':
        newBlock.title.text = "Education & Employment";
        newBlock.items = [
          { id: `i1`, text: "Postdoctoral Researcher", subtext: "University of Tech (2020-Present)", date: "2020-Present" },
          { id: `i2`, text: "PhD in Computer Science", subtext: "Science Institute (2015-2020)", date: "2015-2020" }
        ];
        break;
      case 'lab-team':
        newBlock.title.text = "Team Members";
        newBlock.layoutConfig!.columns = 2;
        newBlock.items = [
          { id: `i1`, text: "Dr. Smith", subtext: "Postdoc Researcher\nFocus: Computer Vision", image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400" },
          { id: `i2`, text: "Jane Doe", subtext: "PhD Candidate\nFocus: Natural Language Processing", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&get=crop&q=80&w=400" }
        ];
        break;
      case 'about-me':
        newBlock.title.text = "About Me";
        newBlock.items = [{ id: `i1`, text: "I am a researcher focused on... My background includes..." }];
        break;
      case 'resources':
        newBlock.title.text = "Research Resources";
        newBlock.items = [
          { id: `i1`, text: "Open Dataset v1.0", subtext: "Download link available on GitHub", date: "2023" },
          { id: `i2`, text: "Algorithm Toolkit", subtext: "Python library for advanced vision tasks", date: "2022" }
        ];
        break;
      case 'funding':
        newBlock.title.text = "Funding & Projects";
        newBlock.items = [
          { id: `i1`, text: "National Science Grant #12345", subtext: "Lead Investigator (2022-2025)", date: "2022-2025" }
        ];
        break;
      case 'editorial-services':
        newBlock.title.text = "Editorial Services";
        newBlock.items = [
          { id: `i1`, text: "Associate Editor", subtext: "Journal of Artificial Intelligence", date: "2021-Present" },
          { id: `i2`, text: "Program Committee Member", subtext: "CVPR, ICCV, NeurIPS", date: "Ongoing" }
        ];
        break;
      case 'impact-outreach':
        newBlock.title.text = "Impact & Outreach";
        newBlock.items = [
          { id: `i1`, text: "Public Lecture Series", subtext: "Engaging local communities in science", date: "2023" }
        ];
        break;
      case 'technical-skills':
        newBlock.title.text = "Technical Skills";
        newBlock.items = [
          { id: `i1`, text: "Programming", subtext: "Python, C++, Java, Rust", icon: 'none' },
          { id: `i2`, text: "Machine Learning", subtext: "PyTorch, TensorFlow, Scikit-learn", icon: 'none' }
        ];
        break;
      case 'contact-grid':
        newBlock.title.text = "Contact Information";
        newBlock.layoutConfig!.columns = 4;
        newBlock.items = [
          { id: 'i1', text: "Email", subtext: "contact@university.edu", icon: 'email', url: "mailto:contact@university.edu" },
          { id: 'i2', text: "Google Scholar", subtext: "Lei Zhang Profile", icon: 'scholar', url: "#" },
          { id: 'i3', text: "GitHub", subtext: "github.com/lei-zhang", icon: 'github', url: "#" },
          { id: 'i4', text: "ORCID", subtext: "0000-0000-0000-0000", icon: 'orcid', url: "#" }
        ];
        break;
      case 'custom':
        newBlock.title.text = "New Section";
        newBlock.items = [{ id: `i1`, text: "Custom content goes here." }];
        break;
      default:
        newBlock.items = [{ id: `i-${Date.now()}`, text: "Add content here.", subtext: "Secondary info." }];
    }

    const nextPages = [...profile.pages];
    nextPages[pageIndex].layout.push(newBlock);
    pushToHistory({ ...profile, pages: nextPages });
  };

  const deleteBlock = (blockId: string) => {
    const pageIndex = profile.pages.findIndex(p => p.id === activePageId);
    if (pageIndex === -1) return;
    const nextPages = [...profile.pages];
    nextPages[pageIndex].layout = nextPages[pageIndex].layout.filter(b => b.id !== blockId);
    pushToHistory({ ...profile, pages: nextPages });
    setEditingElement(null);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const pageIndex = profile.pages.findIndex(p => p.id === activePageId);
    if (pageIndex === -1) return;
    const newLayout = [...profile.pages[pageIndex].layout];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newLayout.length) return;
    [newLayout[index], newLayout[target]] = [newLayout[target], newLayout[index]];
    const nextPages = [...profile.pages];
    nextPages[pageIndex].layout = newLayout;
    pushToHistory({ ...profile, pages: nextPages });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (file && editingElement) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (type === 'image') {
          // Perform combined updates in a single profile state transition to avoid race conditions
          updateMultipleByPath([
            {path: [...editingElement.path, 'image'], value: dataUrl},
            {path: [...editingElement.path, 'icon'], value: 'none'}
          ]);
        } else {
          updateByPath([...editingElement.path, 'url'], dataUrl);
        }
        // Reset value to allow re-upload of same file
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const renderInspector = () => {
    if (!editingElement) return null;
    let current: any = profile;
    editingElement.path.forEach(key => current = current?.[key]);
    const item = current as EditableItem;
    const isBlockConfig = editingElement.type === 'block-config';
    const isThemeColor = editingElement.type === 'theme-color';
    // Included 'bio' and 'text' types to allow bold/italic edits for bio paragraphs
    const isItem = editingElement.type === 'item' || editingElement.type === 'member' || editingElement.type === 'bio' || editingElement.type === 'text' || editingElement.type === 'photo';
    const blockRef = isBlockConfig ? current as SectionBlock : null;

    const getParentBlockPath = () => {
      const parts = editingElement.path;
      const blockIdx = parts.indexOf('layout') + 1;
      if (blockIdx > 0 && blockIdx < parts.length) {
        return parts.slice(0, blockIdx + 1);
      }
      return null;
    };

    // Determine if the currently edited component supports media
    const isMediaItem = editingElement.type === 'photo' || editingElement.type === 'member' || editingElement.path.some(() => {
      const parts = editingElement.path;
      const blockIdx = parts.indexOf('layout') + 1;
      if (blockIdx > 0 && blockIdx < parts.length) {
        const pageIdx = parseInt(parts[1]);
        const bIdx = parseInt(parts[blockIdx]);
        const blockObj = profile.pages[pageIdx]?.layout[bIdx];
        return ['bio-hero', 'group-photo', 'lab-team', 'technical-skills', 'contact-grid', 'list', 'publications', 'education-employment', 'activities', 'resources'].includes(blockObj?.type || '');
      }
      return false;
    });

    return (
      <div className="fixed bottom-8 right-8 z-[300] bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 w-[450px] animate-in slide-in-from-right-8 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inspector: {editingElement.type}</h3>
          <div className="flex gap-2">
             {isBlockConfig && (
               <button onClick={() => deleteBlock(blockRef!.id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg" title="Delete Block">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </button>
             )}
             {(editingElement.type === 'item' || editingElement.type === 'member' || editingElement.type === 'photo') && (
               <button onClick={() => removeItemFromBlock(editingElement.path)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg" title="Remove Item">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </button>
             )}
             <button onClick={() => setEditingElement(null)} className="text-slate-400 hover:text-slate-900">✕</button>
          </div>
        </div>

        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
          {(editingElement.type === 'item' || editingElement.type === 'member' || editingElement.type === 'photo') && getParentBlockPath() && (
            <div className="pb-4 border-b border-slate-100 mb-4">
              <button 
                onClick={() => addItemToBlock(getParentBlockPath()!)}
                className="w-full py-2 bg-slate-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-200 hover:bg-slate-100 transition-all"
              >
                + Add Another Image/Entry to this block
              </button>
            </div>
          )}

          {isThemeColor && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aesthetic Overrides</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Page Background</label>
                  <input type="color" className="w-full h-8 rounded-lg" value={profile.themeSettings?.[theme]?.backgroundColor || '#ffffff'} onChange={e => updateByPath(['themeSettings', theme, 'backgroundColor'], e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Accent / Header</label>
                  <input type="color" className="w-full h-8 rounded-lg" value={profile.themeSettings?.[theme]?.headerColor || '#0f172a'} onChange={e => updateByPath(['themeSettings', theme, 'headerColor'], e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {!isBlockConfig && !isThemeColor && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Typography & Content</label>
                
                {/* 字体选择独立一行，因为名字比较长 */}
                <select className="w-full p-2 bg-slate-50 rounded-lg text-xs mb-2" value={item?.style?.fontFamily || 'sans'} onChange={e => updateByPath([...editingElement.path, 'style', 'fontFamily'], e.target.value)}>
                  {FONTS.map(f => <option key={f.key} value={f.key}>{f.name}</option>)}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  {/* 字体大小 */}
                  <input type="text" placeholder="Size (e.g. 15)" className="w-full p-2 bg-slate-50 rounded-lg text-xs" value={item?.style?.fontSize || ''} onChange={e => updateByPath([...editingElement.path, 'style', 'fontSize'], e.target.value)} />
                  
                  {/* 行距 (Line Height) - 新增功能 */}
                  <input type="text" placeholder="Line Height (e.g. 1.6)" className="w-full p-2 bg-slate-50 rounded-lg text-xs" value={item?.style?.lineHeight || ''} onChange={e => updateByPath([...editingElement.path, 'style', 'lineHeight'], e.target.value)} />
                </div>
                
                <div className="flex gap-2">
                  <input type="color" className="flex-1 h-8 rounded-lg" value={item?.style?.color || '#000000'} onChange={e => updateByPath([...editingElement.path, 'style', 'color'], e.target.value)} />
                  <button 
                    onClick={() => updateByPath([...editingElement.path, 'style', 'fontWeight'], item.style?.fontWeight === 'bold' ? 'normal' : 'bold')}
                    className={`px-4 h-8 rounded-lg text-[10px] font-black border transition-all ${item.style?.fontWeight === 'bold' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                  >
                    BOLD
                  </button>
                  <button 
                    onClick={() => updateByPath([...editingElement.path, 'style', 'fontStyle'], item.style?.fontStyle === 'italic' ? 'normal' : 'italic')}
                    className={`px-4 h-8 rounded-lg text-[10px] font-black italic border transition-all ${item.style?.fontStyle === 'italic' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                  >
                    ITALIC
                  </button>
                </div>
                
                {item?.hasOwnProperty('date') && (
                   <div className="space-y-1 pt-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Year / Period</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 2020-Present" 
                        className="w-full p-2 bg-slate-50 rounded-lg text-xs border border-transparent focus:border-indigo-200" 
                        value={item?.date || ''} 
                        onChange={e => updateByPath([...editingElement.path, 'date'], e.target.value)} 
                      />
                   </div>
                )}

                {/* Dimension Control for Photo-heavy blocks like group-photo */}
                {(editingElement.type === 'photo' || editingElement.type === 'item' || editingElement.type === 'member') && getParentBlockPath() && (() => {
                  const parts = editingElement.path;
                  const blockIdx = parts.indexOf('layout') + 1;
                  const pageIdx = parseInt(parts[1]);
                  const bIdx = parseInt(parts[blockIdx]);
                  const block = profile.pages[pageIdx]?.layout[bIdx];
                  if (block?.type === 'group-photo') {
                    return (
                      <div className="space-y-1 pt-4 border-t border-slate-100">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Image Height (px)</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="range" min="100" max="800" step="10"
                            className="flex-1 h-1 bg-slate-200 rounded-full appearance-none accent-slate-900"
                            value={parseInt(item.style?.height || '0') || 400}
                            onChange={e => updateByPath([...editingElement.path, 'style', 'height'], `${e.target.value}px`)}
                          />
                          <span className="text-[10px] font-black text-slate-600 w-12">{item.style?.height || 'Auto'}</span>
                        </div>
                        <button 
                          onClick={() => updateByPath([...editingElement.path, 'style', 'height'], undefined)}
                          className="mt-2 text-[8px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700"
                        >
                          Reset to Auto (16:9)
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="space-y-1 pt-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Primary Text / Caption</label>
                  <textarea 
                    ref={contentTextareaRef}
                    className="w-full p-3 bg-slate-50 rounded-xl text-sm min-h-[120px] border border-transparent focus:border-indigo-200 outline-none transition-all" 
                    value={item?.text || ''} 
                    onChange={e => updateByPath([...editingElement.path, 'text'], e.target.value)} 
                    placeholder="Enter main text..."
                  />
                </div>

                <div className="space-y-1 pt-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Secondary Details</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 rounded-xl text-sm min-h-[100px] border border-transparent focus:border-indigo-200 outline-none transition-all" 
                    value={item?.subtext || ''} 
                    onChange={e => updateByPath([...editingElement.path, 'subtext'], e.target.value)} 
                    placeholder="Enter secondary details..."
                  />
                </div>
              </div>

              {isMediaItem && editingElement.type !== 'bio' && editingElement.type !== 'text' && (
                <div className="space-y-4 pt-4 border-t">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Media & Identity</label>
                  
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {TECH_ICONS.map(iconName => (
                      <button 
                        key={iconName}
                        onClick={() => {
                          updateMultipleByPath([
                            {path: [...editingElement.path, 'icon'], value: iconName},
                            {path: [...editingElement.path, 'image'], value: undefined}
                          ]);
                        }}
                        className={`p-2 py-3 rounded-lg border text-center transition-all ${item.icon === iconName ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-300'}`}
                        title={iconName}
                      >
                        <span className="text-[8px] uppercase font-black">
                          {iconName === 'none' ? '✕' : 
                           iconName === 'scholar' ? 'SCHO' : 
                           iconName === 'orcid' ? 'ORCI' : 
                           iconName === 'weibo' ? 'WEIB' :
                           iconName === 'zhihu' ? 'ZHIH' :
                           iconName === 'bilibili' ? 'BILI' :
                           iconName === 'location' ? 'ADDR' :
                           iconName.slice(0,4)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors"
                    >
                      {item.image ? 'Change Custom Image' : 'Upload Custom Image'}
                    </button>
                    {item.image && (
                      <button 
                        onClick={() => updateByPath([...editingElement.path, 'image'], undefined)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-100"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inline Styles & Links</label>
                  <button onClick={() => addInlineLink(editingElement.path)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700">+ NEW SEGMENT</button>
                </div>
                {(item?.inlineLinks || []).map((link, idx) => (
                  <div key={link.id} className="p-4 bg-slate-50 rounded-xl space-y-4 relative group border border-slate-100 shadow-sm">
                    <button onClick={() => removeInlineLink(editingElement.path, link.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500">✕</button>
                    
                    <div className="space-y-1">
                       <label className="text-[8px] font-bold text-slate-400 uppercase">Text to format/link</label>
                       <input placeholder="Match Text" className="w-full p-2 text-xs bg-white rounded border border-slate-100" value={link.matchText} onChange={e => updateByPath([...editingElement.path, 'inlineLinks', idx.toString(), 'matchText'], e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">Font</label>
                        <select className="w-full p-2 bg-white border border-slate-100 rounded text-[10px]" value={link.style?.fontFamily || ''} onChange={e => updateByPath([...editingElement.path, 'inlineLinks', idx.toString(), 'style', 'fontFamily'], e.target.value)}>
                          <option value="">Default</option>
                          {FONTS.map(f => <option key={f.key} value={f.key}>{f.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">Size</label>
                        <input placeholder="e.g. 1rem" className="w-full p-2 text-[10px] bg-white rounded border border-slate-100" value={link.style?.fontSize || ''} onChange={e => updateByPath([...editingElement.path, 'inlineLinks', idx.toString(), 'style', 'fontSize'], e.target.value)} />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => updateByPath([...editingElement.path, 'inlineLinks', idx.toString(), 'style', 'fontWeight'], link.style?.fontWeight === 'bold' ? 'normal' : 'bold')}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black border transition-all ${link.style?.fontWeight === 'bold' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
                      >
                        BOLD
                      </button>
                      <button 
                        onClick={() => updateByPath([...editingElement.path, 'inlineLinks', idx.toString(), 'style', 'fontStyle'], link.style?.fontStyle === 'italic' ? 'normal' : 'italic')}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black italic border transition-all ${link.style?.fontStyle === 'italic' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
                      >
                        ITALIC
                      </button>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase">Color</label>
                      <input type="color" className="w-full h-6 rounded border border-slate-100" value={link.style?.color || '#000000'} onChange={e => updateByPath([...editingElement.path, 'inlineLinks', idx.toString(), 'style', 'color'], e.target.value)} />
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <label className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Hyperlink Settings</label>
                      <select 
                        className="w-full p-2 text-[10px] bg-white rounded border border-slate-100"
                        value={link.linkType || 'none'}
                        onChange={e => updateByPath([...editingElement.path, 'inlineLinks', idx.toString(), 'linkType'], e.target.value)}
                      >
                        <option value="none">No Link</option>
                        <option value="external">External Web URL</option>
                        <option value="internal">Local Website Page</option>
                        <option value="file">Upload Local File</option>
                      </select>
                    </div>

                    {(link.linkType === 'external' || !link.linkType) && (
                      <input placeholder="https://..." className="w-full p-2 text-[10px] bg-white rounded border border-slate-100" value={link.url} onChange={e => updateByPath([...editingElement.path, 'inlineLinks', idx.toString(), 'url'], e.target.value)} />
                    )}

                    {link.linkType === 'internal' && (
                      <select 
                        className="w-full p-2 text-[10px] bg-white rounded border border-slate-100"
                        value={link.internalPageId}
                        onChange={e => updateByPath([...editingElement.path, 'inlineLinks', idx.toString(), 'internalPageId'], e.target.value)}
                      >
                        <option value="">Select a Page...</option>
                        {profile.pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                    )}

                    {link.linkType === 'file' && (
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => {
                            setEditingElement({ type: 'inline-file-upload', path: [...editingElement.path, 'inlineLinks', idx.toString()] });
                            genericFileInputRef.current?.click();
                          }}
                          className="w-full py-2 bg-slate-900 text-white rounded text-[8px] font-black uppercase tracking-widest"
                        >
                          {link.url?.startsWith('data:') ? 'Change Attached File' : 'Choose Local File'}
                        </button>
                        {link.url?.startsWith('data:') && <span className="text-[8px] text-green-500 font-bold uppercase">✓ File Attached</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isBlockConfig && blockRef && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Block Layout</label>
              
              <div className="pt-2">
                <button 
                  onClick={() => addItemToBlock(editingElement.path)}
                  className="w-full py-3 bg-[#9B89B3] text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg hover:brightness-110 transition-all"
                >
                  + Add New Entry
                </button>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Block Background</label>
                  <button 
                    onClick={() => updateByPath([...editingElement.path, 'layoutConfig', 'backgroundColor'], 'transparent')}
                    className="text-[8px] font-black text-[#9B89B3] bg-purple-50 px-2 py-1 rounded hover:bg-purple-100 transition-colors border border-purple-100"
                  >
                    NO BACKGROUND COLOR
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                   {allColors.map(c => (
                     <button 
                       key={c.primary} 
                       onClick={() => updateByPath([...editingElement.path, 'layoutConfig', 'backgroundColor'], c.primary)}
                       className={`w-6 h-6 rounded-full border border-white shadow-sm transition-transform hover:scale-125 ${blockRef.layoutConfig?.backgroundColor === c.primary ? 'ring-2 ring-slate-900 scale-110 z-10' : ''}`}
                       style={{ backgroundColor: c.primary }}
                       title={c.name}
                     />
                   ))}
                   <div className="flex items-center gap-2 mt-1 w-full pt-2 border-t border-slate-200">
                     <label className="text-[8px] font-bold text-slate-400 uppercase">Custom HEX</label>
                     <input 
                       type="color" 
                       className="w-full h-8 p-0 border-0 bg-transparent cursor-pointer rounded overflow-hidden" 
                       value={blockRef.layoutConfig?.backgroundColor && blockRef.layoutConfig.backgroundColor !== 'transparent' ? blockRef.layoutConfig.backgroundColor : primaryColor} 
                       onChange={e => updateByPath([...editingElement.path, 'layoutConfig', 'backgroundColor'], e.target.value)} 
                     />
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 border-t pt-4">
                {(['narrow', 'medium', 'wide', 'full'] as const).map(w => (
                  <button key={w} onClick={() => updateByPath([...editingElement.path, 'layoutConfig', 'width'], w)} className={`py-2 rounded-lg text-[9px] font-black uppercase ${blockRef.layoutConfig?.width === w ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                    {w}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex justify-between">Columns <span>{blockRef.layoutConfig?.columns}</span></label>
                <input type="range" min="1" max="4" value={blockRef.layoutConfig?.columns || 1} onChange={e => updateByPath([...editingElement.path, 'layoutConfig', 'columns'], parseInt(e.target.value))} className="w-full h-1 bg-slate-200 rounded-full appearance-none accent-slate-900" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans">
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
      <input type="file" ref={genericFileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'file')} />
      <input type="file" accept=".json" ref={jsonFileInputRef} className="hidden" onChange={handleImportConfig} />
      
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-[200]">
        <div className="flex items-center gap-10">
          <div className="flex flex-col">
             <h1 className="text-xs font-black text-slate-900 uppercase tracking-widest">{profile.subdomain}.port</h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-100 shadow-sm">
            {profile.pages.map((p, idx) => (
              <div key={p.id} className="flex items-center group relative">
                <input className={`px-4 py-2 bg-transparent text-[10px] font-black focus:outline-none w-28 text-center ${activePageId === p.id ? 'text-slate-900' : 'text-slate-400'}`} value={p.title} onClick={() => setActivePageId(p.id)} onChange={e => updateByPath(['pages', idx.toString(), 'title'], e.target.value)} />
                {profile.pages.length > 1 && <button onClick={() => deletePage(p.id)} className="opacity-0 group-hover:opacity-100 text-[8px] text-red-400 absolute -top-1 -right-1 bg-white rounded-full shadow p-0.5">✕</button>}
              </div>
            ))}
            <button onClick={addPage} className="w-8 h-8 flex items-center justify-center text-[#9B89B3] hover:bg-purple-50 rounded-full text-xl font-light">+</button>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex items-center bg-slate-50 rounded-full border border-slate-100 p-1">
             <button 
               onClick={undo} 
               disabled={historyIndex === 0}
               className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${historyIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
               title="Undo (Ctrl+Z)"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
             </button>
             <button 
               onClick={redo} 
               disabled={historyIndex >= history.length - 1}
               className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${historyIndex >= history.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
               title="Redo (Ctrl+Y)"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
             </button>
           </div>

           <div className="relative">
              <input type="text" placeholder="Search content..." className="pl-8 pr-4 py-2 bg-slate-100 rounded-full text-[10px] font-bold w-40 border border-transparent focus:border-[#9B89B3] outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <svg className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
           <div className="flex flex-wrap gap-1 max-w-[212px] justify-end">
             {allColors.map(c => (
               <button 
                 key={c.primary} 
                 onClick={() => setPrimaryColor(c.primary)} 
                 title={c.name}
                 className={`w-3.5 h-3.5 rounded-full transition-all hover:scale-125 ${primaryColor === c.primary ? 'ring-2 ring-slate-900 scale-110 shadow-sm' : 'opacity-60 hover:opacity-100'}`} 
                 style={{ backgroundColor: c.primary }} 
               />
             ))}
           </div>
           <div className="flex items-center gap-2">
             <button onClick={saveConfig} className="px-5 py-3 bg-white text-slate-900 border border-slate-200 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-50 transition-all">Save Config</button>
             <button onClick={() => jsonFileInputRef.current?.click()} className="px-5 py-3 bg-white text-slate-900 border border-slate-200 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-50 transition-all">Import Config</button>
             <button onClick={() => {
               setPublishSubdomain(profile.subdomain);
               setIsPublishDialogOpen(true);
             }} className="px-7 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:shadow-2xl transition-all">Launch Site</button>
           </div>
        </div>
      </header>

      {hasApiKey === false && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white rounded-[40px] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <svg className="w-10 h-10 text-[#9B89B3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tighter">AI Activation Required</h2>
            <p className="text-slate-500 mb-10 leading-relaxed font-medium">To power the Bio-optimizer and intelligent suggestions, please select a valid Gemini API key from your workspace.</p>
            <button onClick={handleSelectKey} className="w-full py-5 bg-[#9B89B3] text-white rounded-2xl font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl hover:shadow-purple-100 hover:-translate-y-1">Select API Key</button>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="block mt-8 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] hover:text-[#9B89B3] transition-colors">Billing Documentation</a>
          </div>
        </div>
      )}

      {isPublishDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-12 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-[#9B89B3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </div>
            <h2 className="text-3xl font-black mb-2 tracking-tighter text-slate-900">Download for GitHub</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium leading-relaxed">Download a functional <span className="font-bold">index.html</span> file that you can host on GitHub Pages to launch your academic portal immediately.</p>
            
            <div className={`flex items-center gap-2 p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-8`}>
              <input 
                className="bg-transparent flex-1 font-bold text-slate-900 outline-none text-lg" 
                value={publishSubdomain} 
                onChange={e => setPublishSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                placeholder="my-domain" 
                autoFocus
              />
              <span className="text-slate-400 font-bold">.github.io</span>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsPublishDialogOpen(false)} 
                className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={exportForGithub} 
                className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                Download index.html
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 bg-white border-r border-slate-200 p-6 space-y-8 overflow-y-auto custom-scrollbar">
          <section>
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Aesthetics</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {THEME_LIST.map(t => (
                <button key={t.id} onClick={() => setTheme(t.id as ThemeType)} className={`px-3 py-4 rounded-xl text-[9px] font-black uppercase border transition-all ${theme === t.id ? 'bg-[#9B89B3] text-white shadow-lg border-[#9B89B3]' : 'bg-white text-slate-400 border-slate-100 hover:border-[#9B89B3]/30'}`}>
                  {t.name}
                </button>
              ))}
            </div>
            <button onClick={() => setEditingElement({ type: 'theme-color', path: [] })} className="w-full py-2 bg-slate-50 text-slate-500 text-[9px] font-black uppercase rounded-lg border-2 border-dashed hover:bg-slate-100 transition-colors">Theme Colors</button>
          </section>

          <section>
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Layer Stack</h3>
            <div className="space-y-2">
              {activePage.layout.map((b, idx) => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group border border-transparent hover:border-[#9B89B3]/20 transition-all">
                  <span className="text-[9px] font-black text-slate-500 uppercase truncate max-w-[90px]">{b.type}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingElement({ type: 'block-config', path: ['pages', profile.pages.findIndex(p => p.id === activePageId).toString(), 'layout', idx.toString()] })} className="text-[8px] font-black text-[#9B89B3] hover:brightness-75">EDIT</button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveBlock(idx, 'up')} className="text-slate-400 hover:text-slate-900">▴</button>
                      <button onClick={() => moveBlock(idx, 'down')} className="text-slate-400 hover:text-slate-900">▾</button>
                      <button onClick={() => deleteBlock(b.id)} className="text-red-300 hover:text-red-500 ml-1">✕</button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <select onChange={e => { if (e.target.value) { addBlock(e.target.value as BlockType); e.target.value = ""; } }} className="w-full py-3 bg-[#9B89B3] text-white rounded-xl text-[9px] font-black uppercase text-center focus:outline-none cursor-pointer hover:brightness-110 transition-all shadow-md">
                  <option value="">+ ADD COMPONENT</option>
                  <optgroup label="Research & Team">
                    <option value="bio-hero">Individual Profile</option>
                    <option value="lab-team">Team Grid (Members)</option>
                    <option value="group-photo">Group Image / Photo Grid</option>
                    <option value="group-summary">Group Overview</option>
                  </optgroup>
                  <optgroup label="Academic Content">
                    <option value="education-employment">Education & Employment</option>
                    <option value="publications">Publications</option>
                    <option value="funding">Funding / Grants</option>
                    <option value="resources">Datasets & Code</option>
                  </optgroup>
                  <optgroup label="Service">
                    <option value="activities">Activities & Service</option>
                    <option value="editorial-services">Editorial Roles</option>
                    <option value="impact-outreach">Impact & Outreach</option>
                  </optgroup>
                  <optgroup label="Misc">
                    <option value="technical-skills">Technical Skills</option>
                    <option value="join-lab">Join the Lab</option>
                    <option value="contact-grid">Contact Section</option>
                    <option value="custom">Custom Section</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </section>
        </aside>

        <main className="flex-1 overflow-y-auto p-12 bg-[#f8fafc] flex justify-center custom-scrollbar">
          <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-10 duration-700">
             <AcademicTemplate 
                data={profile}
                activePageId={activePageId}
                setActivePageId={setActivePageId}
                theme={theme}
                primaryColor={primaryColor}
                onSelectElement={setEditingElement}
                searchQuery={searchQuery}
             />
          </div>
        </main>
      </div>
      {renderInspector()}
    </div>
  );
};

export default App;
