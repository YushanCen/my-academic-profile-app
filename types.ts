
export type ThemeType = 'theme-1' | 'theme-2' | 'theme-3' | 'theme-4' | 'theme-5' | 'theme-6' | 'theme-7' | 'theme-8' | 'theme-9' | 'theme-10' | 'theme-11' | 'theme-12' | 'theme-13' | 'theme-14' | 'theme-15';
export type BlockType = 
  | 'bio-hero' 
  | 'list' 
  | 'image-card' 
  | 'education' 
  | 'publications' 
  | 'research-interests' 
  | 'contact-grid' 
  | 'lab-team' 
  | 'lab-summary' 
  | 'stats-grid'
  | 'activities'
  | 'education-employment'
  | 'join-lab'
  | 'about-me'
  | 'resources'
  | 'funding'
  | 'editorial-services'
  | 'impact-outreach'
  | 'technical-skills'
  | 'group-photo'
  | 'group-summary'
  | 'custom';

export interface InlineLink {
  id: string;
  matchText: string;
  url?: string;
  linkType?: 'external' | 'internal' | 'file' | 'none';
  internalPageId?: string;
  style?: ElementStyle;
}

export interface ElementStyle {
  fontSize?: string;
  color?: string;
  fontFamily?: 'sans' | 'serif' | 'mono' | 'times' | 'georgia';
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: string;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  borderRadius?: string;
  padding?: string;
  opacity?: string;
  width?: string;
  height?: string; // Added height property
  scale?: number;
}

export interface EditableItem {
  id: string;
  text?: string;
  subtext?: string;
  url?: string;
  linkType?: 'external' | 'internal' | 'file';
  internalPageId?: string;
  inlineLinks?: InlineLink[];
  style?: ElementStyle;
  label?: string;
  image?: string;
  date?: string;
  icon?: 'email' | 'github' | 'orcid' | 'scholar' | 'twitter' | 'weibo' | 'zhihu' | 'bilibili' | 'location' | 'custom' | 'none';
  customIcon?: string; // base64 data
}

export interface SectionBlock {
  id: string;
  type: BlockType;
  title: EditableItem;
  items: EditableItem[];
  layoutConfig?: {
    columns?: number;
    showImage?: boolean;
    imagePosition?: 'left' | 'right' | 'top';
    width?: 'narrow' | 'medium' | 'wide' | 'full';
    backgroundColor?: string;
    aspectRatio?: string; // Added aspect ratio control
    itemHeight?: string; // Added height control for block level
  };
}

export interface PageData {
  id: string;
  title: string;
  layout: SectionBlock[];
}

export interface ThemeSettings {
  backgroundColor?: string;
  headerColor?: string;
  sidebarColor?: string;
  accentColor?: string;
}

export interface AcademicProfile {
  subdomain: string;
  name: EditableItem;
  pages: PageData[];
  contact: {
    email: EditableItem;
    links: EditableItem[];
  };
  themeSettings?: Partial<Record<ThemeType, ThemeSettings>>;
}
