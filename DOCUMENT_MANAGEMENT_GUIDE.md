# Document Management & Search Guide
## JurisFlow Legal Practice Management System

**Document Version:** 1.0  
**Last Updated:** December 22, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Document Upload](#document-upload)
3. [Document Search](#document-search)
4. [Document Organization](#document-organization)
5. [Document Viewer](#document-viewer)
6. [Bulk Operations](#bulk-operations)
7. [Google Docs Integration](#google-docs-integration)
8. [AI-Powered Document Analysis](#ai-powered-document-analysis)

---

## Overview

JurisFlow Document Management provides a complete solution for organizing, searching, and working with legal documents.

### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-format Support** | PDF, DOCX, TXT, JPG, PNG |
| **Full-Text Search** | Search within document names, descriptions, tags, and content |
| **Matter Organization** | Associate documents with specific cases |
| **Version Control** | Track document versions and changes |
| **In-Browser Preview** | View documents without downloading |
| **Google Docs Sync** | Connect and sync Google Docs |
| **AI Analysis** | Summarize, analyze documents with AI |

---

## Document Upload

### How to Upload Documents

```
┌─────────────────────────────────────────────────────────────────┐
│  DOCUMENT UPLOAD WORKFLOW                                       │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  1. Click "Upload" button (top right)                           │
│  2. Select file from your computer                              │
│  3. Choose a Matter (optional)                                  │
│  4. Click "Upload"                                              │
│  5. Document appears in file grid                               │
└─────────────────────────────────────────────────────────────────┘
```

### Supported File Types

| Type | Extension | Preview Support |
|------|-----------|-----------------|
| **PDF** | .pdf | ✅ Full in-browser preview |
| **Word** | .docx | ✅ Converted to HTML preview |
| **Text** | .txt | ✅ Full text preview |
| **Images** | .jpg, .png | ✅ Image preview |

### Upload Steps

1. Navigate to **Documents** from the sidebar
2. Click the **Upload** button
3. Select a file from your computer
4. A modal appears asking which Matter to assign
5. Select a Matter or choose "No Matter (Unassigned)"
6. Click **Upload**
7. Document is uploaded to the server and appears in the grid

---

## Document Search

### Search Capabilities

JurisFlow provides **multi-field search** that searches across:

```
┌─────────────────────────────────────────────────────────────────┐
│  SEARCH LOOKS IN THESE FIELDS:                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📄 Document Name      → "contract.pdf"                         │
│  📝 Description        → "Employment agreement for John"        │
│  🏷️ Tags               → "contract, HR, employment, 2024"       │
│  📑 Text Content       → (extracted text from PDF/DOCX)         │
└─────────────────────────────────────────────────────────────────┘
```

### How to Search

1. Use the **search bar** in the top right corner
2. Type your search query
3. Results filter in real-time

### Search Examples

| Search Query | What It Finds |
|--------------|---------------|
| `contract` | Any document with "contract" in name, description, or tags |
| `smith` | Documents related to client "Smith" |
| `motion dismiss` | Motion to Dismiss documents |
| `2024` | Documents tagged or created in 2024 |
| `deposition` | Deposition transcripts and related files |

### Backend Search API

The search also works at the API level:

```
GET /api/documents?q=contract

Response: All documents where:
- name CONTAINS "contract" (case-insensitive)
- description CONTAINS "contract"
- tags CONTAINS "contract"
- textContent CONTAINS "contract"
```

### Full-Text Search (textContent)

When documents are uploaded, the system can extract text content:

```
Example: Uploading "motion_to_dismiss.pdf"

1. File uploaded to server
2. (Optional) Text extraction runs on PDF
3. Extracted text stored in database field "textContent"
4. Search query "dismiss" finds this document
```

> **Note:** Text extraction for PDFs requires OCR processing. Currently, this feature is planned but not automatically enabled for all uploads.

---

## Document Organization

### Folder Structure (Matter-Based)

Documents are organized by **Matter** (legal case):

```
Documents
├── My Files (All Documents)
│
├── 2024-001 - Smith v. Jones
│   ├── complaint.pdf
│   ├── answer.docx
│   └── evidence_photo.jpg
│
├── 2024-002 - ABC Corp Merger
│   ├── merger_agreement.pdf
│   └── due_diligence.docx
│
└── Unassigned
    └── template.docx
```

### Sidebar Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│  LOCATIONS                                                      │
│  ─────────────────────────────────────────────────────────────  │
│  📁 My Files            → Shows ALL documents                   │
│                                                                 │
│  MATTERS                                                        │
│  ─────────────────────────────────────────────────────────────  │
│  📁 2024-001            → Only docs for this matter             │
│  📁 2024-002            → Only docs for this matter             │
│  📁 2024-003            → Only docs for this matter             │
└─────────────────────────────────────────────────────────────────┘
```

### Filtering by Type

Use the **Filter** button to filter by:

**By File Type:**
- All Files
- PDFs
- Documents (DOCX)

**By Category:**
- Contracts
- Notices
- Court Orders
- Evidence
- Invoices

### Assigning Documents to Matters

**Option 1: During Upload**
1. Upload a file
2. Select Matter in the popup modal
3. Click Upload

**Option 2: After Upload (Edit)**
1. Find the document in the grid
2. Click the 📁 icon
3. Select a Matter from dropdown
4. Click Save

---

## Document Viewer

### In-Browser Preview

JurisFlow supports previewing documents without downloading:

```
┌─────────────────────────────────────────────────────────────────┐
│  DOCUMENT VIEWER                                                │
│  ─────────────────────────────────────────────────────────────  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ motion_to_dismiss.pdf                       [X] Close     │  │
│  │ 2.5 MB • Dec 22, 2025                                     │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │                    [PDF Preview]                          │  │
│  │                                                           │  │
│  │              Rendered directly in browser                 │  │
│  │                                                           │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │                                    [Download] button      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Preview by File Type

| Type | Preview Method |
|------|----------------|
| **PDF** | Embedded iframe viewer |
| **DOCX** | Converted to HTML using Mammoth.js |
| **TXT** | Plain text display with monospace font |
| **Images** | Direct image display |

### How to Open Documents

1. Find the document in the grid
2. Click **Aç** (Open)
3. Document opens in modal viewer
4. Click **İndir** (Download) to save locally
5. Click **X** to close

---

## Bulk Operations

### Select Multiple Documents

```
┌─────────────────────────────────────────────────────────────────┐
│  BULK OPERATIONS                                                │
│  ─────────────────────────────────────────────────────────────  │
│  ☑️ 3 documents selected                                        │
│                                                                 │
│  [Select All] [Assign to Matter ▾] [Apply] [Clear]             │
└─────────────────────────────────────────────────────────────────┘
```

### How to Use Bulk Operations

1. Check the **Seç** (Select) checkbox on documents
2. A blue bar appears at the top
3. Select a Matter from the dropdown
4. Click **Matter'a Ata** (Assign to Matter)
5. All selected documents are assigned

### Bulk Actions Available

| Action | Description |
|--------|-------------|
| **Select All** | Select all visible documents |
| **Assign to Matter** | Move all selected to a specific matter |
| **Clear Selection** | Deselect all documents |

---

## Google Docs Integration

### Connect Google Docs

1. Click **Connect Google Docs** button
2. Google OAuth login page opens
3. Grant permissions to JurisFlow
4. Return to app with connection active

### Sync Google Docs

Once connected:

1. Click **Sync Google Docs** button
2. Your Google Docs are imported as documents
3. Documents appear in the file grid
4. Links open in Google Docs editor

### Required Permissions

| Permission | Purpose |
|------------|---------|
| `documents.readonly` | Read Google Docs content |
| `drive.readonly` | List files in Google Drive |

---

## AI-Powered Document Analysis

### AI Drafter Integration

JurisFlow includes an AI assistant that can analyze documents:

```
┌─────────────────────────────────────────────────────────────────┐
│  AI DRAFTER                                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Summarize] [Research] [Draft] [Analyze] [Tasks] [Template]  │
│                                                                 │
│  1. Select documents from the sidebar                           │
│  2. Click "Summarize" to get document summary                   │
│  3. AI analyzes selected documents                              │
│  4. Response includes key findings                              │
└─────────────────────────────────────────────────────────────────┘
```

### AI Capabilities

| Feature | Description |
|---------|-------------|
| **Summarize** | Get key points from documents |
| **Research** | Find relevant case law (with web search) |
| **Draft** | Generate legal document drafts |
| **Analyze** | Analyze case facts and strategy |
| **Tasks** | Generate task lists from documents |
| **Template** | Fill legal document templates |

### How to Use AI Analysis

1. Navigate to **AI Drafter** from sidebar
2. Select documents in the right sidebar (Documents Panel)
3. Click a quick action button or type a prompt
4. AI processes your request with document context
5. Response appears in chat interface

---

## Document Card Details

### Document Card Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ☐ Seç                        📄                 [Aç] [İndir] 📁│
│  ─────────────────────────────────────────────────────────────  │
│  contract_v2.pdf                                                │
│  📁 2024-001 - Smith v. Jones                                   │
│  🏷️ contract, employment, HR                                    │
│  2.5 MB                                          Dec 22, 2025   │
│  ┌─────────┐                                                    │
│  │ Contract│ ← Category badge                                   │
│  └─────────┘                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Card Actions

| Button | Action |
|--------|--------|
| **Seç** | Select for bulk operations |
| **Aç** | Open in viewer |
| **İndir** | Download file |
| **📁** | Edit matter/tags/category |
| **🗑️** | Delete document |

### Document Metadata

| Field | Description |
|-------|-------------|
| **Name** | Original filename |
| **Matter** | Associated legal case |
| **Tags** | Searchable keywords |
| **Size** | File size in MB |
| **Date** | Last modified date |
| **Category** | Document type classification |

---

## Version Control

### Version Tracking

JurisFlow tracks document versions:

```
document_v1.pdf    → Version 1
document_v1.pdf    → Version 2 (uploaded again)
document_v1.pdf    → Version 3 (latest modification)
```

### Version Fields

| Field | Description |
|-------|-------------|
| `version` | Version number |
| `groupKey` | Groups versions of same document |
| `isLatest` | Indicates current version |

---

## Tips & Best Practices

### Naming Conventions

✅ **Good:**
- `2024-001_motion_to_dismiss.pdf`
- `smith_employment_contract_v2.docx`
- `deposition_witness_john_doe.pdf`

❌ **Avoid:**
- `document.pdf`
- `scan123.pdf`
- `new file (2).docx`

### Tagging Strategy

Use consistent tags:

| Category | Example Tags |
|----------|--------------|
| **Document Type** | motion, contract, deposition, brief |
| **Stage** | draft, final, signed, filed |
| **Party** | plaintiff, defendant, witness |
| **Year** | 2024, 2025 |
| **Status** | pending, approved, rejected |

### Organization Tips

1. **Always assign to a Matter** - Don't leave critical documents unassigned
2. **Use tags liberally** - More tags = easier search
3. **Set categories** - Helps with filtering
4. **Add descriptions** - Brief note about document purpose
5. **Use consistent naming** - Include case number in filename

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Global search (Command Palette) |
| `Escape` | Close modal/viewer |

---

## Troubleshooting

### "No documents found"

**Possible causes:**
- Filter is active (check filter settings)
- Matter is selected (click "My Files" to see all)
- Search query has typo
- Documents haven't loaded yet

### "Content not available"

**Possible causes:**
- File was uploaded before server storage was configured
- File upload failed partially
- Try re-uploading the document

### "Failed to upload"

**Possible causes:**
- File too large (check server limits)
- Network connection issue
- Server storage full
- Unsupported file type

---

*This guide covers the Document Management features in JurisFlow. For additional help, check the README.md or contact your system administrator.*
