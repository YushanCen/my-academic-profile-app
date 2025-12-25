
import { AcademicProfile } from './types';

export const INITIAL_DATA: AcademicProfile = {
  subdomain: "scholar-portal",
  name: { id: 'name', text: "Your Name", style: { fontSize: '2.5rem', fontWeight: '800', fontFamily: 'serif' } },
  pages: [
    {
      id: 'p1',
      title: 'Home',
      layout: [
        {
          id: 'b1',
          type: 'bio-hero',
          title: { 
            id: 't1', 
            text: "Academic Director & Principal Investigator",
            inlineLinks: [
              {
                id: 'seg1',
                matchText: 'Academic Director',
                linkType: 'none',
                style: { fontFamily: 'serif', color: '#002147' }
              }
            ]
          },
          items: [
            { id: 'i1', text: "Dedicated to pushing the boundaries of Computer Vision and Artificial Intelligence. Leading a world-class team of researchers at the intersection of theory and application.", image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800", style: { scale: 1 } }
          ],
          layoutConfig: { imagePosition: 'right', width: 'wide' }
        }
      ]
    }
  ],
  contact: {
    email: { id: 'c1', text: "contact@university.edu", url: "mailto:contact@university.edu", icon: 'email', label: 'Email' },
    links: [
      { id: 'l1', label: 'Google Scholar', url: '#', icon: 'scholar' },
      { id: 'l2', label: 'GitHub', url: '#', icon: 'github' },
      { id: 'l3', label: 'ORCID', url: '#', icon: 'orcid' }
    ]
  },
  themeSettings: {}
};

export const ACADEMIC_PALETTES = [
  { group: 'Academic Classical', colors: [
    { name: 'Stanford Red', primary: '#8C1515', secondary: '#B1040E', bg: '#fdf7f7' },
    { name: 'Yale Blue', primary: '#00356B', secondary: '#286dc0', bg: '#f0f4f8' },
    { name: 'Harvard Crimson', primary: '#A51C30', secondary: '#ed1b34', bg: '#fcf2f3' },
    { name: 'Oxford Navy', primary: '#002147', secondary: '#00356B', bg: '#f4f7f9' },
    { name: 'Princeton Orange', primary: '#E77500', secondary: '#000000', bg: '#fffaf0' },
    { name: 'Tsinghua Purple', primary: '#660874', secondary: '#A68EA3', bg: '#faf5fb' },
    { name: 'UPenn Blue', primary: '#011F5B', secondary: '#990000', bg: '#f1f4f9' },
    { name: 'Deep Brown', primary: '#4B2E1D', secondary: '#6D4C41', bg: '#f7f4f2' },
    { name: 'Charcoal Grey', primary: '#333333', secondary: '#545454', bg: '#f5f5f5' },
    { name: 'Academic Black', primary: '#0A0A0A', secondary: '#2C2C2C', bg: '#f0f0f0' },
    { name: 'Dartmouth Green', primary: '#00693E', secondary: '#1E4D2B', bg: '#f5f9f6' },
    { name: 'Chicago Maroon', primary: '#800000', secondary: '#A00000', bg: '#fdf2f2' }
  ]},
  { group: 'Morandi Palette', colors: [
    { name: 'Muted Lavender', primary: '#9B89B3', secondary: '#B7A9C9', bg: '#f9f8fb' },
    { name: 'Dusty Rose', primary: '#B38B8B', secondary: '#D4ABAB', bg: '#fcf8f8' },
    { name: 'Slate Blue', primary: '#7A8DA1', secondary: '#A1B3C6', bg: '#f9fbfc' },
    { name: 'Foggy Teal', primary: '#7A9A9B', secondary: '#9AB7B8', bg: '#f7fbfc' },
    { name: 'Sage Green', primary: '#8F9B8B', secondary: '#ADB9A9', bg: '#f8f9f8' },
    { name: 'Silver Pine', primary: '#6B7B61', secondary: '#8B9B81', bg: '#f6f8f5' },
    { name: 'Ash Purple', primary: '#7D5A7A', secondary: '#A68EA3', bg: '#fcfafc' },
    { name: 'Muted Olive', primary: '#7D7D5A', secondary: '#9E9E7A', bg: '#f9f9f5' },
    { name: 'Terracotta Sand', primary: '#A68B7D', secondary: '#C7AC9E', bg: '#faf8f7' },
    { name: 'Driftwood Brown', primary: '#7D6A5A', secondary: '#A38F7D', bg: '#f9f7f5' },
    { name: 'Muted Sky', primary: '#8BA9B3', secondary: '#A9C7D4', bg: '#f8fbfc' },
    { name: 'Warm Stone', primary: '#B3A68B', secondary: '#D4C7A9', bg: '#fafaf8' }
  ]}
];

export const FONTS = [
  { name: 'Inter (Sans)', value: 'Inter, sans-serif', key: 'sans' },
  { name: 'Lora (Serif)', value: 'Lora, serif', key: 'serif' },
  { name: 'Times New Roman', value: '"Times New Roman", Times, serif', key: 'times' },
  { name: 'Georgia', value: 'Georgia, serif', key: 'georgia' },
  { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace', key: 'mono' }
];

export const THEME_LIST = [
  { id: 'theme-1', name: 'THEME 1' },
  { id: 'theme-2', name: 'THEME 2' },
  { id: 'theme-3', name: 'THEME 3' },
  { id: 'theme-4', name: 'THEME 4' },
  { id: 'theme-5', name: 'THEME 5' },
  { id: 'theme-6', name: 'THEME 6' },
  { id: 'theme-7', name: 'THEME 7' },
  { id: 'theme-8', name: 'THEME 8' }
];
