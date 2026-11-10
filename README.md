# AI-TaxPilot

### AI-Powered Fiscal Document Analysis & Management

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![Turso](https://img.shields.io/badge/Database-Turso-4FF8D2)
![Groq](https://img.shields.io/badge/AI-Groq-orange)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-In%20Development-yellow)

> Transforming fiscal document management through artificial intelligence, automated processing, and structured data analysis.

**Live Application:** [taxpilot-en.vercel.app](https://taxpilot-en.vercel.app)

---

## 🎯 Overview

**AI-TaxPilot** is an AI-powered web application designed to simplify the management and analysis of Italian fiscal and accounting documents.

The project combines traditional document processing with Large Language Models (LLMs) to support document classification, information extraction, and automated validation.

The objective is to reduce repetitive administrative tasks and make fiscal information easier to organize, analyze, and retrieve.

The platform currently focuses on Italian fiscal documents, with potential for future expansion to other European markets.

---

## ✨ Features

### 📁 Intelligent Document Management

- Upload PDF and XML documents.
- Automatic document classification.
- Italian electronic invoice processing.
- Payroll document recognition.
- Document storage and retrieval.
- Client-based document organization.
- Structured information extraction.

### 🤖 AI-Powered Analysis

- LLM integration through Groq API.
- AI-assisted fiscal document analysis.
- Automated extraction of relevant information.
- Technical document validation.
- Detection of potential inconsistencies.
- Combined deterministic and AI-assisted analysis.

The validation architecture combines technical parsing with LLM-based analysis when configured.

### 🧾 Fiscal & Accounting Tools

- Italian electronic invoice parsing.
- VAT-related processing components.
- Payroll analysis services.
- Accounting records and registers.
- Financial document organization.

These modules support document analysis and accounting workflows but do not replace professional fiscal verification.

### 📊 Dashboard & Analytics

- Document management dashboard.
- Document statistics and reporting components.
- Activity information.
- Data visualization.
- Client management interfaces.

**Note:** Some analytics endpoints currently use demonstration data rather than production statistics.

### 🔐 Authentication & Access

- User registration and login.
- JWT-based authentication.
- Email verification.
- Protected API endpoints.
- Trial account configuration.

Trial limits are configured in the application, but trial enforcement is currently disabled in part of the backend.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend Framework | Next.js 15 |
| Frontend Library | React |
| Language | TypeScript, JavaScript |
| Styling | Tailwind CSS |
| Backend | Node.js, Express |
| Database | Turso / libSQL |
| AI Integration | Groq API |
| Authentication | JWT |
| PDF Processing | pdf-parse |
| XML Processing | xml2js |
| OCR Utilities | Tesseract.js |
| Charts | Recharts |
| Frontend Hosting | Vercel |

---

## 🏗️ System Architecture

AI-TaxPilot uses a frontend-backend architecture that separates user interaction, document processing, AI analysis, and database management.

### Application Flow

**Document Upload → File Validation → Classification → Data Extraction → AI Analysis → Results & Storage**

### Frontend

Built with Next.js and React.

Responsibilities include:

- User authentication interfaces.
- Document upload and management.
- Dashboard visualization.
- Displaying analysis results.
- Client and document navigation.

### Backend

Built with Node.js and Express.

Responsibilities include:

- REST API endpoints.
- Authentication and authorization.
- Document classification.
- PDF and XML processing.
- AI integration.
- Accounting and analytics services.
- Database operations.

### AI Processing

The document validation pipeline combines:

1. **Technical Parsing** — Extracts document fields and performs deterministic checks.
2. **AI Analysis** — Uses an LLM for additional analysis when available.
3. **Result Processing** — Organizes validation results, errors, warnings, and extracted information.

---

## 🗄️ Data Management

TaxPilot uses Turso, a database platform based on libSQL.

The application manages information related to:

| Data Category | Purpose |
|---|---|
| Users | Accounts and authentication |
| Clients | Customer information |
| Documents | Uploaded files and extracted data |
| Document Analysis | Classification and validation results |
| Accounting | Financial records and registers |
| Subscription Settings | Trial and account configurations |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or later
- npm
- A Turso database
- A JWT secret
- Groq API key (optional for AI functionality)

### 1. Clone the Repository

```bash
git clone https://github.com/Morrix76/taxpilot-en.git
cd taxpilot-en
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=3003
NODE_ENV=development

TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token

JWT_SECRET=your_secure_jwt_secret

GROQ_API_KEY=your_groq_api_key
```

The Groq key is optional. Without it, AI analysis is unavailable.

The Turso database must have the required application schema initialized before use. Additional configuration may be needed for email verification.

Start the backend:

```bash
npm run start:dev
```

The backend uses port `3003` by default.

### 3. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3003
```

Start the frontend:

```bash
npm run dev
```

Open:

`http://localhost:3001`

**Important:** Never commit API keys, database tokens, or other secrets to GitHub.

---

## 🧪 Development & Testing

AI-TaxPilot follows an iterative AI-assisted software development methodology.

My responsibilities include:

1. **Problem Analysis** — Identifying administrative challenges and defining product objectives.
2. **Requirements Definition** — Establishing expected behavior, constraints, and priorities.
3. **Technical Evaluation** — Reviewing architectural and implementation options with AI assistance.
4. **AI-Assisted Development** — Coordinating implementation using Claude, Cursor, and ChatGPT.
5. **Testing & Debugging** — Investigating errors, checking system behavior, and validating results.
6. **Continuous Improvement** — Refining the application through repeated development and verification cycles.

AI supports coding and technical reasoning, while I guide the process, evaluate decisions, and verify outcomes.

---

## 🔭 Roadmap

Future development priorities:

- [ ] Improve document classification reliability.
- [ ] Expand fiscal document support.
- [ ] Strengthen automated validation.
- [ ] Replace remaining demonstration analytics with real data.
- [ ] Complete and validate subscription enforcement.
- [ ] Expand automated test coverage.
- [ ] Improve monitoring and error handling.
- [ ] Explore support for additional European fiscal systems.

These represent development objectives, not completed functionality.

---

## ⚠️ Project Status & Limitations

**AI-TaxPilot is under active development.**

The repository contains working implementations and experimental components that require further validation.

Current limitations include:

- Some analytics endpoints use mock data.
- Subscription enforcement is not fully enabled.
- AI-generated conclusions may contain errors.
- Fiscal validation has not been independently certified.
- Production readiness and regulatory compliance are not guaranteed.

**Disclaimer:** AI-TaxPilot is a software development project, not a substitute for professional tax, accounting, or legal advice.

---

## 📄 License

This project is distributed under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Francesco Ciardo**

AI Builder | AI-Assisted Software Development | AI Engineering

- **GitHub:** [Morrix76](https://github.com/Morrix76)
- **LinkedIn:** [Professional Profile](https://linkedin.com/in/dias-ai)
- **Website:** [DIAS AI](https://diasai.xyz/)

---

*Building practical AI-powered software through structured development, testing, and continuous improvement.*
