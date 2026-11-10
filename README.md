# AI-TaxPilot

### AI-Powered Fiscal Document Analysis & Management

AI-TaxPilot is a web application designed to simplify the processing, organization, and analysis of Italian fiscal and accounting documents through artificial intelligence.

The project explores how LLMs and automated document processing can reduce repetitive administrative work and make financial information easier to access and understand.

**Project status:** Ongoing development.

---

## Project Overview

Managing fiscal documents often involves repetitive tasks such as document classification, data extraction, information verification, and record organization.

AI-TaxPilot brings these activities together in a web-based application combining document processing, AI-assisted analysis, and structured data management.

The platform is primarily designed around Italian fiscal documents, with potential for future adaptation to other European markets.

## Core Features

### Document Processing
- Upload and manage PDF and XML documents.
- Classify different document types.
- Process Italian electronic invoices.
- Extract and organize document information.
- Store and retrieve document records.

### AI-Assisted Analysis
- LLM-based document analysis using Groq.
- Structured extraction of fiscal information.
- Document validation utilities.
- Technical parsing when AI services are unavailable.

### Fiscal & Accounting Modules
- Electronic invoice processing.
- Payroll-related analysis components.
- VAT and accounting data management.
- Accounting registers and transaction structures.

### User Management
- User registration and authentication.
- JWT-based access control.
- Email verification.
- Trial account configuration.

### Analytics
- Dashboard and reporting components.
- Document and activity statistics.
- Data visualization.

**Note:** Some analytics endpoints currently use demonstration data. Not all modules have been validated for production use.

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js, Express |
| Database | Turso / libSQL |
| AI Integration | Groq API |
| Authentication | JWT |
| Document Processing | PDF parsing, XML processing, OCR utilities |
| Data Visualization | Recharts |
| Frontend Deployment | Vercel |

---

## System Architecture

AI-TaxPilot uses a frontend-backend architecture.

**Frontend**
- Web interface for users.
- Authentication and document management.
- Dashboard and reporting views.

**Backend**
- REST API services.
- Document processing and classification.
- AI integration.
- Authentication middleware.
- Accounting and analytics modules.

**Database**
- Document records.
- User accounts.
- Client information.
- Accounting-related data.

The application integrates external LLM services for AI-assisted analysis while maintaining dedicated backend components for document processing and data persistence.

---

## Development Approach

AI-TaxPilot was developed using an AI-assisted software engineering workflow.

My role involves:

- Identifying the problem and defining product requirements.
- Establishing application objectives and functional specifications.
- Evaluating architectural and technical decisions with AI support.
- Coordinating implementation using AI-assisted development tools.
- Investigating errors and validating application behavior.
- Iteratively improving the product through testing and review.

AI tools support code generation, technical analysis, and implementation, while I guide the development process and evaluate the results.

---

## Current Limitations

AI-TaxPilot is an evolving project.

- Some features require additional testing and validation.
- Certain analytics components use mock data.
- Trial enforcement is not fully enabled in the current implementation.
- Fiscal analysis results require independent verification.
- The application is not a substitute for professional tax or accounting advice.

Production readiness and regulatory compliance have not been independently established.

---

## Project Objectives

The long-term goals include:

- Improving document classification accuracy.
- Expanding structured information extraction.
- Strengthening automated validation.
- Improving reliability and error handling.
- Supporting additional fiscal document formats.
- Exploring adaptation to other European fiscal systems.

---

## Author

**Francesco Ciardo**

AI Builder | AI-Assisted Software Development | AI Engineering

- [GitHub](https://github.com/Morrix76)
- [LinkedIn](https://linkedin.com/in/dias-ai)
- [Website](https://diasai.xyz/)
