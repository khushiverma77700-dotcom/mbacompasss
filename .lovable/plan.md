## AI SEO Enhancement System

### Overview
Build an AI-powered SEO tool that analyzes content and suggests trending keywords, meta tags, schema markup, and on-page optimizations. Available both as a button inside each admin editor and as a central SEO dashboard.

### Architecture

**Backend**: A Lovable AI edge function (`ai-seo-enhance`) that:
- Takes content type + content data as input
- Uses AI to generate: trending keywords (long-tail, short-tail, FAQs), optimized meta title & description, H1 tag, schema markup suggestions, on-page SEO tips
- Returns structured suggestions for review

**Frontend Components**:

1. **`AISEOButton` component** — Reusable button added to each admin editor (Articles, Institutes, Colleges, Exams, City Pages)
   - Opens a dialog showing AI-generated SEO suggestions
   - "Apply" button fills the form fields with approved suggestions
   
2. **`/admin/seo-dashboard` page** — Central dashboard
   - Select content type → see all items with SEO scores
   - Run AI analysis on any item
   - Bulk operations

### Content Types Covered
- Articles & Blog posts
- Institutes  
- Colleges
- Exams
- City/State Pages

### AI Suggestions Include
- **Keywords**: Trending long-tail, short-tail, FAQ-style, student search queries
- **Meta**: Title (≤60 chars), Description (≤155 chars), H1 tag
- **Schema**: Auto-generated JSON-LD for the content type
- **On-page**: Internal linking suggestions, content structure tips
- **Technical**: Canonical URL, Open Graph tags

### Workflow
1. Admin clicks "AI SEO" button on any editor
2. AI analyzes the content and generates suggestions
3. Suggestions shown in a review dialog with approve/reject per field
4. On approval, fields are auto-filled in the form
5. Admin saves as normal

### Implementation Steps
1. Create the `ai-seo-enhance` edge function
2. Build the `AISEOSuggestions` dialog component
3. Add the AI SEO button to all 5 admin editors
4. Build the central SEO dashboard page
5. Add route to admin navigation
