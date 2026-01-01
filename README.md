# Shadisite.in - Wedding Biodata Generator

A modern, feature-rich web application for creating professional marriage biodata documents. Built specifically for the Indian matrimonial market with comprehensive support for cultural, religious, and astrological preferences.

## Overview

Shadisite.in is a Next.js-based biodata generator that enables users to create, customize, and download professional marriage biodata documents as PDF files. The application features a multi-step wizard interface, real-time preview, and intelligent multi-page PDF generation.

## Features

### Core Functionality
- **Multi-Step Wizard**: 5-step guided form for systematic data entry
- **Live Preview**: Real-time canvas preview that updates as users input information
- **Professional Templates**: 5 beautifully designed templates to choose from:
  - Modern Geometric
  - Classic Minimal
  - Nature Green
  - Royal Maroon
  - Yellow Maroon
- **PDF Export**: Download complete biodata as professionally formatted A4 PDF documents

### Customization Options
- **Custom Fields**: Add unlimited custom fields to any section (personal, family, contact)
- **Image Upload**: Upload personal photos with customizable border radius
- **Deity Logos**: Choose from 10 religious/cultural logo options
- **Typography Control**: Customize fonts, sizes, colors, and weights for body text and headings
- **Template Backgrounds**: Each template features unique background images and color schemes

### Technical Features
- **Intelligent Pagination**: Automatic content distribution across multiple A4 pages
- **High-Quality Output**: 2x DPI scaling for crisp, professional rendering
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Type Safety**: Full TypeScript support throughout the application

## Tech Stack

### Framework & Core
- **Next.js 15.5.4** - React framework with App Router
- **React 19.1.0** - UI library
- **TypeScript 5** - Type safety and enhanced developer experience

### Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **@tailwindcss/postcss** - PostCSS integration

### PDF & Canvas
- **jsPDF 3.0.3** - PDF generation from canvas
- **html2canvas 1.4.1** - Canvas rendering and image manipulation

### Fonts
- **Geist** - Modern sans-serif and monospace fonts
- **Pacifico** - Decorative script font for branding

## Getting Started

### Prerequisites
- Node.js 20 or higher
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd shadisite.in
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
shadisite.in/
├── src/
│   └── app/
│       ├── page.tsx              # Main biodata generator component
│       ├── layout.tsx            # Root layout with fonts and global styling
│       ├── globals.css           # Global styles
│       └── layouts/
│           ├── Header.tsx        # Navigation header
│           └── Footer.tsx        # Site footer
├── public/
│   └── images/
│       ├── dieties/              # Religious/cultural logo images
│       ├── layouts/              # Template layout images
│       ├── logo/                 # Site logo
│       └── layout-*.jpeg         # Template background images
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality

## How It Works

### Step 1: Template Selection
Choose from 5 professionally designed templates, each with unique backgrounds and color schemes.

### Step 2: Image Upload
Upload personal photos and select deity logos to personalize your biodata.

### Step 3: Content Entry
Fill in comprehensive information across three main categories:
- **Personal Details** (28+ fields): Basic information, astrological data, physical attributes, education, occupation, hobbies, etc.
- **Family Details** (10+ fields): Parents, siblings, family status, values, etc.
- **Contact Details** (10+ fields): Phone, email, address, preferred contact times, etc.

Add custom fields to any section for additional information specific to your needs.

### Step 4: Field Management
Reorder fields using move up/down buttons, delete custom fields, or edit labels to organize your biodata exactly as you want.

### Step 5: Customization & Download
Fine-tune typography settings:
- Body text font, size, color, and weight
- Heading font, size, color, and weight

Preview your biodata in real-time and download as a professional PDF document.

## Data Fields

The application supports comprehensive data entry with the following field categories:

### Personal Details
Name, Date of Birth, Time of Birth, Place of Birth, Gender, Marital Status, Religion, Caste, Sub-caste, Rashi, Nakshatra, Gotra, Manglik Status, Complexion, Body Type, Height, Weight, Blood Group, Mother Tongue, Community, Education, Occupation, Annual Income, Diet, Hobbies, Interests, Languages Known, Personal Bio, Expectations

### Family Details
Grandparents, Father's Name, Mother's Name, Siblings, Kids, Relatives, Family Mother Tongue, Family Status, Family Type, Family Values, Family Income, Family Assets, Family Bio

### Contact Details
Personal Contact, Contact Person, Email, Phone, Mobile, Hometown, Current Address, Permanent Address, Preferred Contact Time, Photo Profile, Notes

## Features in Detail

### Intelligent Pagination System
- Pre-calculates page breaks based on actual text wrapping
- Smart heading placement to avoid repetition across pages
- A4 proportions (500x707 px) with high DPI scaling
- Automatic content distribution across multiple pages

### Custom Field System
- Add unlimited custom fields to any section
- Support for multiple input types: text, textarea, date, time, select, radio
- Reorder fields with visual feedback
- Edit labels for custom fields

### PDF Generation
- Multi-page support with intelligent content distribution
- Rounded image corners with canvas clipping
- High-quality output (2x DPI scaling)
- Professional formatting with customizable typography
- Filename includes user's name for easy identification

## Browser Compatibility

The application works best in modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

## Development

### Code Style
The project uses ESLint for code quality and follows Next.js best practices.

### Type Safety
Full TypeScript support with strict mode enabled for enhanced developer experience and runtime safety.

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.

## Support

For issues or questions, please open an issue in the GitHub repository.

---

Built with Next.js, React, and TypeScript. Designed for the Indian matrimonial community.
