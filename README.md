# Exam Navigator

Read this website - https://collegehai.com/

First, analyze the entire structure of https://collegehai.com/. Identify each key component they offer—such as search, listings, categories, filters, course details, comparisons, user personalization, admin functionality, and SEO features. Now, create a plan to replicate these features for a coaching listing business. Outline how we will adapt each feature for coaching institutes, ensuring it is fully SEO-friendly. The plan should include category-specific user interfaces (like MBA, me

Goals: The MVP will allow students to find coaching institutes across categories (MBA, medical, engineering, government exams) and compare courses. The goal is a seamless search, personalized user experience, and admin control over content.

 Target Users: Students preparing for competitive exams (MBA, NEET, JEE, UPSC), and parents assisting them.

 Core Features:

 Homepage: Search bar (course or institute), featured categories, sliding banners for promotions, top-rated coaching.

 Category Pages: Separate pages for MBA, medical, engineering, and government exams. Filter by location, fees, ratings.

 Coaching Page: For each institute—overview, faculty profiles, course list with fees, success rates, reviews, and comparison of multiple courses.

 User Interface: Personalized dashboard based on user-selected exam category, with the ability to switch between exam interfaces.

 Course Comparison: Compare up to 3 courses (fees, duration, faculty, reviews).

 Blog/News: Articles, exam tips, news updates.

 Admin Access: Full CMS for adding/editing coaching listings, changing banners, editing news/blogs, managing categories, and user feedback.

 Tech Stack:

 Front End: React (or Angular) for dynamic UI.

 Back End: Node.js with Express or Django.

 Database: PostgreSQL or MongoDB.

 Hosting: AWS (EC2, S3) or Azure.

 Authentication: OAuth or custom JWT.

 SEO: Server-side rendering, SEO-friendly URLs, meta tags, and performance optimization.

 User Journey:

 Onboarding: Users select their target exam (MBA, NEET, etc.) at login.

 Dashboard: Personalized content (e.g., MBA users see MBA-focused coaching first, but can switch to other exam categories).

 Search & Filter: Find coaching by category, location, fees, ratings. Compare courses easily.

 Course Details: View course-specific pages with duration, curriculum, faculty, success stories.

 Blogs/News: Exam tips, articles, announcements.

 Admin Panel:

 Coaching Management: Add, edit, or remove institutes and courses.

 Content Control: Update banners, articles, news, user feedback.

 User Management: Manage users, access control, and feedback responses.

 SEO & Performance:

 SEO: Server-side rendering (Next.js if needed), sitemap, meta descriptions, page speed optimization.

 Mobile-First: Ensure responsive design for all devices.


For a UI inspired by those sites, use a white and light blue color scheme (no dark blue). The layout should be clean, modern, and intuitive. For the homepage, think large search bar, category cards, and sliding banners. Category pages will have tiles for each coaching institute, with filters visible on the side. On institute pages, use cards for each course with side-by-side comparisons. Ensure easy navigation, consistent top navigation bar, and a clear call-to-action for course inquiries.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mbacompasss.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a538dc13-403b-4e8a-a1d7-7da882f39fe2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `mbacompass` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
