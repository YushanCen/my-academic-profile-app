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
  
  // History management for Undo/Redo
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

  // --- 关键修复：完全动态的主题导出逻辑 ---
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
        /* 基础样式 */
        body { 
            font-family: 'Inter', sans-serif; 
            background-color: #f8fafc; 
            color: #0f172a; 
        }
        /* 强制类名优先级 */
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
<body class="font-sans antialiased text-slate-900">
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

            /* 1. 动态生成容器样式 (对应 AcademicTemplate 的 getThemeClass) */
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

            /* 2. 动态生成头部样式 (对应 AcademicTemplate 的 getHeaderClass) */
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

            const getStyleAttr = (s) => {
              if(!s) return 'style="white-space: pre-wrap;"';
              let styleStr = 'style="white-space: pre-wrap; ';
              
              if(s.fontSize) styleStr += \`font-size: \${String(s.fontSize).match(/^\\d+$/) ? s.fontSize + 'px' : s.fontSize};\`;
              if(s.fontWeight) styleStr += \`font-weight: \${s.fontWeight};\`;
              if(s.fontStyle) styleStr += \`font-style: \${s.fontStyle};\`; 
              if(s.color) styleStr += \`color: \${s.color};\`;
              
              if(s.fontFamily && families[s.fontFamily]) {
                  styleStr += \`font-family: \${families[s.fontFamily]};\`;
              }
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
                
                if (block.type === 'bio-hero') {
                    content = \`
                        <div class="flex flex-col lg:flex-row gap-16 items-start mb-28 p-8 rounded-3xl" style="background-color: \${primaryColor}08">
                            <img src="\${block.items[0]?.image}" class="w-64 h-80 object-cover shadow-xl border border-slate-100 p-1 bg-white rounded-2xl">
                            <div class="flex-1 space-y-6">
                                <h1 class="text-3xl font-bold tracking-tight text-slate-900 content-text" style="border-left: 6px solid \${primaryColor}; padding-left: 1.5rem; \${getStyleAttr(block.title.style).replace('style="', '').replace('"', '')}">\${processText(block.title.text, block.title.inlineLinks)}</h1>
                                <div class="text-lg leading-relaxed text-slate-700 font-medium content-text" \${getStyleAttr(block.items[0]?.style)}>\${processText(block.items[0]?.text, block.items[0]?.inlineLinks)}</div>
                                \${block.items[0]?.subtext ? \`<div class="text-base text-slate-500 italic opacity-80 content-text" style="">\${processText(block.items[0]?.subtext, block.items[0]?.inlineLinks)}</div>\` : ''}
                            </div>
                        </div>\`;
                } else if (block.type === 'contact-grid') {
                    content = \`
                        <div class="mb-28">
                            <h2 class="text-2xl font-black mb-8 border-b border-slate-100 pb-2 flex items-center gap-4">
                                <span class="w-1.5 h-6 rounded-sm" style="background-color: \${primaryColor}"></span>
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
                    content = \`
                        <div class="mb-28">
                            <h2 class="text-2xl font-black mb-8 border-b border-slate-100 pb-2 flex items-center gap-4">
                                <span class="w-1.5 h-6 rounded-sm" style="background-color: \${primaryColor}"></span>
                                \${processText(block.title.text, block.title.inlineLinks)}
                            </h2>
                            <div class="space-y-10">
                                \${block.items.map(item => \`
                                    <div class="pb-10 border-b border-slate-100 flex flex-col md:flex-row gap-6 md:gap-16 last:border-0">
                                        \${item.date ? \`<div class="w-20 shrink-0 font-black text-slate-300 text-xl">\${item.date}</div>\` : ''}
                                        \${item.image ? \`<div class="w-32 h-32 shrink-0"><img src="\${item.image}" class="w-full h-full object-cover rounded-xl shadow-md"></div>\` : ''}
                                        <div class="flex-1">
                                            <div class="text-xl font-bold text-slate-800 content-text" \${getStyleAttr(item.style)}>\${processText(item.text, item.inlineLinks)}</div>
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
            
            /* 3. 使用动态类名 (getHeaderClass, getThemeClass) */
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
  // ... rest of the component
