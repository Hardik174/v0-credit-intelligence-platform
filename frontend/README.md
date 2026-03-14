# Credit Intelligence Platform

An enterprise-grade financial credit analysis platform that transforms raw financial documents into comprehensive Credit Assessment Memorandums (CAM) using AI-powered intelligence.

## 🎯 Platform Overview

The Credit Intelligence Platform is designed for credit analysts, financial institutions, and NBFCs to streamline the credit assessment process. It provides a modern, intuitive interface for managing entity evaluations, document processing, financial analysis, and risk assessment.

## 🏗️ Architecture

### Frontend Stack
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **Recharts** - Data visualization
- **Zustand** - Lightweight state management
- **Lucide React** - Icon library

### State Management
- **Zustand** - Client-side state for UI, entities, and documents
- **React Hooks** - Custom hooks for data fetching and business logic

## 📁 Project Structure

```
src/
├── app/                          # Next.js app routes
│   ├── dashboard/               # Dashboard overview
│   ├── entities/                # Entity management
│   ├── documents/               # Document upload & management
│   ├── extraction/              # Data extraction review
│   ├── research/                # Research insights
│   ├── risk-engine/             # Risk analysis
│   ├── cam-report/              # Credit assessment report
│   ├── ai-assistant/            # AI chat interface
│   ├── schema-builder/          # Custom schema editor
│   ├── new-assessment/          # Assessment creation wizard
│   ├── settings/                # User preferences
│   └── globals.css              # Global styles
├── components/
│   ├── layout/                  # Layout components (Sidebar, Header, AppShell)
│   ├── shared/                  # Reusable components (Skeleton, StatusTracker, etc.)
│   ├── charts/                  # Chart components (FinancialChart, etc.)
│   └── ui/                      # shadcn components
├── hooks/                       # Custom React hooks
│   ├── useEntities.ts          # Entity data management
│   ├── useDocuments.ts         # Document handling
│   ├── useExtraction.ts        # Data extraction
│   ├── useResearch.ts          # Research insights
│   ├── useRiskAnalysis.ts      # Risk scoring
│   ├── useCAM.ts               # CAM report management
│   └── useNotifications.ts     # Notification handling
├── store/                       # Zustand stores
│   ├── entityStore.ts          # Entity state
│   ├── documentStore.ts        # Document state
│   └── uiStore.ts              # UI state
├── types/                       # TypeScript types
│   ├── entity.ts               # Entity interfaces
│   ├── document.ts             # Document interfaces
│   ├── extraction.ts           # Extraction interfaces
│   ├── research.ts             # Research interfaces
│   ├── risk.ts                 # Risk interfaces
│   └── cam.ts                  # CAM interfaces
└── lib/
    ├── utils.ts                # Utility functions
    ├── api.ts                  # API client
    └── constants.ts            # Constants and enums
```

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#3b82f6)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Danger**: Red (#ef4444)
- **Neutrals**: Gray scale (#ffffff to #111827)

### Components
The platform uses shadcn/ui components which include:
- Cards, Buttons, Inputs
- Tables, Tabs, Dialogs
- Badges, Dropdowns, Popovers
- Form controls and validation

### Typography
- **Headings**: Inter font family, bold weights
- **Body**: Inter font family, regular weights
- **Code**: Monospace for technical content

## 🚀 Key Features

### 1. Dashboard
- Overview of all credit assessments
- Key metrics (Total entities, Loans under review, Risk scores)
- Recent assessment activity
- Quick navigation to active cases

### 2. Entity Management
- Create and manage entities (companies)
- Store comprehensive entity information
- Financial snapshot tracking
- Loan details management
- Collateral information

### 3. Document Management
- Upload multiple document types (ALM, Annual Reports, etc.)
- Document classification with AI confidence scores
- Progress tracking for document processing
- Multi-format support (PDF, Excel, CSV, Images)

### 4. Data Extraction
- AI-powered data extraction from documents
- Field-level confidence indicators
- Human-in-the-loop validation
- Table extraction and editing
- Flagging of low-confidence fields

### 5. Financial Analysis
- Revenue trends and analysis
- Profit margin calculations
- Debt-to-equity ratios
- Key financial metrics
- Historical comparisons

### 6. Research Insights
- Sector performance tracking
- News and legal alerts
- Sentiment analysis
- Macroeconomic indicators
- Competitor analysis

### 7. Risk Engine
- Multi-category risk assessment
  - Financial Risk
  - Operational Risk
  - Market Risk
  - Governance Risk
- AI-powered risk scoring (0-100)
- Key risk indicators
- Risk distribution visualization

### 8. CAM Report Generation
- Automated CAM report creation
- 14 comprehensive sections:
  - Executive Summary
  - Borrower Profile
  - Industry Analysis
  - Financial Analysis
  - Risk Assessment
  - SWOT Analysis
  - Credit Rating
  - Loan Recommendation
  - And more...
- Editable sections
- PDF/DOCX export
- Internal sharing

### 9. AI Assistant
- Natural language queries about assessments
- Context-aware responses
- Suggested questions
- Chat history

### 10. Schema Builder
- Define custom financial schemas
- Field mapping and configuration
- Reusable schema templates

## 📊 Data Flow

```
Document Upload
    ↓
AI Classification
    ↓
Data Extraction
    ↓
Human Validation
    ↓
Schema Mapping
    ↓
Research Aggregation
    ↓
Risk Analysis
    ↓
CAM Generation
    ↓
Final Review & Export
```

## 🔑 Mock Data

The platform includes comprehensive mock data for development:

### Entities
- Tata Steel Limited (₹50,000 Cr loan)
- Infosys Limited (₹20,000 Cr loan)
- Adani Green Energy (₹100,000 Cr loan)
- HDFC Bank Limited (₹30,000 Cr loan)
- Reliance Industries (₹200,000 Cr loan)

### Documents
- ALM Reports
- Shareholding Patterns
- Borrowing Profiles
- Annual Reports
- Portfolio Performance documents

### Research Data
- Market news and insights
- Legal alerts
- Sector analysis
- Macroeconomic indicators

## 🔌 API Integration

The platform is designed to easily integrate with backend APIs:

```typescript
// Available API endpoints (defined in lib/api.ts)
POST   /entity/create
GET    /entities
GET    /entity/{id}
POST   /documents/upload
GET    /documents
POST   /extraction/{id}/approve
GET    /risk/analysis
POST   /cam/generate
POST   /ai/chat
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The application will be available at `http://localhost:3000`

## 📱 Responsive Design

The platform is fully responsive and works seamlessly across:
- Desktop browsers (1920px+)
- Tablets (768px - 1024px)
- Mobile devices (320px - 767px)

The sidebar collapses on smaller screens for better space utilization.

## ♿ Accessibility

The platform follows WCAG 2.1 guidelines:
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- High contrast color schemes
- Screen reader friendly

## 📈 Performance

Optimizations included:
- Image lazy loading
- Code splitting with Next.js
- Skeleton loaders for async data
- Efficient state management with Zustand
- Responsive images with next/image

## 🔐 Security Considerations

The frontend implements:
- Input validation and sanitization
- Safe error handling
- CSRF protection ready
- XSS prevention through React's built-in escaping

Backend security should include:
- Authentication and authorization
- Rate limiting
- Data encryption
- Audit logging

## 🎯 Future Enhancements

Potential features for expansion:
- Real-time collaboration tools
- Advanced visualization dashboards
- Machine learning model integration
- Workflow automation
- Multi-language support
- Mobile application
- Advanced reporting and analytics

## 📝 Component Documentation

### Custom Hooks

- **useEntities()** - Fetch and manage entity list
- **useEntity(id)** - Fetch specific entity details
- **useDocuments(entityId)** - Fetch documents for entity
- **useExtraction(documentId)** - Fetch extraction results
- **useResearch(entityId)** - Fetch research insights
- **useRiskAnalysis(entityId)** - Fetch risk analysis
- **useCAM(entityId)** - Fetch and manage CAM report
- **useNotifications()** - Manage notification state

### Zustand Stores

- **entityStore** - Entity form data and current step
- **documentStore** - Document list and upload progress
- **uiStore** - Sidebar state, active tabs, search

## 🤝 Contributing

This is a v0.app generated project. For modifications:
1. Update components as needed
2. Follow the existing code structure
3. Maintain type safety with TypeScript
4. Use the established design system

## 📄 License

This project is created with v0.app and follows standard development practices.

## 🙋 Support

For questions or issues, refer to:
- Component documentation in shadcn/ui
- Next.js documentation
- React best practices
- Tailwind CSS utilities

---

**Credit Intelligence Platform** - Transforming Financial Data into Intelligent Credit Decisions
