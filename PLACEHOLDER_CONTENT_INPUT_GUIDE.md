# Signature School Placeholder Content & Data Entry Guide

This document lists the remaining placeholder content in the website and explains exactly where the approved information should be entered.

## Important rules

- Do not place public website content in `.env`. The `.env` file is only for secrets and configuration.
- Do not remove a placeholder until Signature School has supplied and approved the replacement.
- Use the CMS for CMS-managed content. Use the listed source files for the newer custom pages that are currently file-managed.
- After changing file-managed content, run `npm run typecheck` and `npm run build`.
- Never commit `.env`, passwords, API keys, database credentials or SMTP credentials to GitHub.

## Quick priority checklist

| Priority | Missing information                                                    | Where to enter it                                                                     |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| High     | Official phone, email, address and domain                              | `src/lib/brand.ts` or Dashboard → CMS → Contact Details                               |
| High     | Campus directory and campus filters                                    | `src/data/campusData.ts` and `src/routes/find-a-campus.tsx`                           |
| High     | Chairperson photograph and approved 80–120 word profile                | `src/components/about/AboutExperience.tsx` and an image in `src/assets/`              |
| High     | Final admissions cut-off date and confirmation of suggested age ranges | `src/components/institutional/ReferenceAcademicPages.tsx`                             |
| High     | Privacy policy and safeguarding policy                                 | `src/routes/privacy.tsx` and `src/components/institutional/ReferenceLearningPage.tsx` |
| Medium   | Official news articles, dates and photography                          | `src/data/newsData.ts` and `src/assets/`                                              |
| Medium   | Official notices, dates and attachments                                | `src/data/noticeData.ts` and `public/`                                                |
| Medium   | Official school gallery photographs                                    | `src/data/schoolGalleryData.ts` and `src/assets/`                                     |
| Medium   | Leadership details and biographies                                     | `src/components/about/AboutExperience.tsx`                                            |
| Medium   | Academic calendar dates                                                | `src/components/institutional/ReferenceAcademicPages.tsx`                             |
| Low      | Careers vacancies and portal feature access                            | `src/lib/public-content.ts` or the CMS collections                                    |

---

## 1. Global school identity and contact details

### Current placeholders

- Official website domain
- General contact email
- Admissions email
- Careers email
- Phone number
- School address
- Grade ranges for Early Years, Primary, Middle School and Secondary

### Enter the data here

Primary fallback file:

`src/lib/brand.ts`

Replace the `MISSING_CONTENT` values in `BRAND` with approved values.

Contact details can also be managed from:

`/dashboard/cms` → **Contact Details**

The CMS editor is implemented in:

`src/components/dashboard/site/Collections.tsx` → `ContactDetailsPanel`

### Also affected

The footer currently displays “Official phone/email/address to be provided” from:

`src/components/Footer.tsx`

After approved contact details are available, update the footer to read from `BRAND` or the CMS settings rather than keeping static placeholder text.

---

## 2. Find a Campus page

### Public route

`/find-a-campus`

### Current placeholders

- Province list
- City list
- Area list
- Campus name
- Official address
- Phone
- Email
- Grades offered
- Facilities
- Directions/map destination

### Enter the data here

The current visible Campus Finder is file-managed in:

`src/routes/find-a-campus.tsx`

Replace the temporary select options and campus information card with approved campus records.

Shared campus data used by the About “At a Glance” page is in:

`src/data/campusData.ts`

Update:

- `schoolStats`
- `campuses`

Recommended campus record fields:

```ts
{
  id: "unique-campus-id",
  name: "Official Campus Name",
  province: "Province",
  city: "City",
  area: "Area",
  address: "Official postal address",
  phone: "+92 ...",
  email: "campus@example.com",
  grades: "Approved grade range",
  facilities: ["Facility 1", "Facility 2"],
  mapUrl: "Approved Google Maps URL"
}
```

The Apply Online form also contains a pending campus option in:

`src/routes/apply-online.tsx`

Replace “Campus list to be provided” after the campus directory is approved.

---

## 3. Chairperson’s Message

### Public route

`/about/chairperson`

### Current placeholders

- Official chairperson photograph
- Approved 80–120 word chairperson profile/message

The supplied content sheet identifies the Chairperson as **Engr. Dr. Muhammad Afzal (Lt. Gen. Retd., HI(M))**. This has been entered on the public page.

### Enter the data here

Page content:

`src/components/about/AboutExperience.tsx` → `ChairpersonPage`

Replace the temporary photograph and the draft message with approved material when supplied.

### Photograph

1. Add the approved image to a suitable folder under `src/assets/`, for example:
   `src/assets/about/chairperson.webp`
2. Import it in `AboutExperience.tsx`.
3. Replace `galleryItems[0].src` in `ChairpersonPage` with the imported photograph.
4. Replace the placeholder alt text with the chairperson’s approved name and title.

Do not use an unrelated person’s photograph.

---

## 4. Leadership and supporting About pages

### Current placeholders

The reference About detail data contains missing leadership information and generic “TO BE PROVIDED” cards.

### Enter the data here

`src/components/about/AboutExperience.tsx`

Relevant areas:

- `referenceAboutDetails.leadership`
- `ReferenceAboutDetail`

Supply approved names, job titles, biographies and photographs before publishing leadership profiles.

---

## 5. News & Events

### Public routes

- `/news-events`
- `/news-events/:slug`
- `/about/news-events`

### Current placeholders

The existing articles use draft/sample images and are marked with `placeholder: true`.

### Enter the data here

Article content and metadata:

`src/data/newsData.ts`

For every article, update:

- `slug`
- `title`
- `category`
- `date`
- `image`
- `shortDescription`
- `content`
- `gallery`
- `placeholder` to `false` after approval

### Images

Add approved photographs under `src/assets/`, import them into `newsData.ts`, and replace the sample imports.

Only use publication dates, event dates and claims confirmed by Signature School.

---

## 6. Important Notices

### Public routes

- `/about/notices`
- `/about/notices/:noticeId`

### Current placeholders

- Official dates for the admissions document notice
- Official dates for the assessment notice
- Optional downloadable attachments

### Enter the data here

`src/data/noticeData.ts`

Update each notice’s:

- `id`
- `date`
- `category`
- `title`
- `description`
- `content`
- `attachment` when applicable

For downloadable files:

1. Put the approved PDF/document in `public/downloads/`.
2. Set `attachment` to a public path such as `/downloads/official-notice.pdf`.

The detail page automatically displays a download button when `attachment` is present.

---

## 7. School Gallery

### Public route

`/about/signature-school`

### Current placeholders

All current gallery images are labelled as illustrative placeholders.

### Enter the data here

Gallery records:

`src/data/schoolGalleryData.ts`

Gallery page rendering:

`src/components/about/AboutExperience.tsx` → `SignatureSchoolPage`

### Image workflow

1. Add approved images to `src/assets/about/` or another appropriate assets folder.
2. Import them in `schoolGalleryData.ts`.
3. Replace the illustrative image references.
4. Update `alt`, `caption` and `category`.
5. Set `placeholder: false` if that property is retained.
6. Remove “Official image to be provided” from the gallery card after all images are approved.

The CMS media library and gallery editor are available at:

`/dashboard/cms` → **Media Library** / **Gallery**

Implemented in:

- `src/components/dashboard/site/MediaLibrary.tsx`
- `src/components/dashboard/site/GalleryPanel.tsx`

---

## 8. School statistics and institutional claims

### Current placeholders

- Number of campuses
- Number of students
- Number of teachers
- Number of cities
- Number of learning programmes
- Years of education/operation

### Enter the data here

File-managed About statistics:

`src/data/campusData.ts` → `schoolStats`

CMS-managed statistics:

`/dashboard/cms` → the statistics/collections editor

Implemented in:

`src/components/dashboard/site/Collections.tsx`

When a CMS statistic is confirmed, turn off its **Mark as placeholder** setting.

Do not publish approximate numbers unless they are explicitly labelled and approved.

---

## 9. Admissions age limits

### Public route

`/admission-procedure`

### Current status

Suggested minimum and maximum ages from Pre-Nursery through Grade 7 have been entered from `sigschool-content.docx`. They remain visibly identified as suggested guidance.

### Remaining confirmation required

- Final admissions cut-off date
- Approval of the suggested age ranges
- Any permitted age relaxation

### Enter the data here

`src/components/institutional/ReferenceAcademicPages.tsx`

After formal approval, update the age-limit table if required and remove its provisional-policy notice.

---

## 10. Academic calendars

### Public routes

- `/academics`
- `/academics/calendar/:id`

### Current placeholders

- Calendar dates
- Term/season schedules
- Events and academic milestones

### Enter the data here

`src/components/institutional/ReferenceAcademicPages.tsx`

Replace `[Date to be Provided]` and the configurable-calendar placeholder sections with the approved calendar for each academic year and grade group.

If calendars are supplied as PDFs, place them in `public/downloads/` and link each calendar card to the correct file.

---

## 11. Policies and safeguarding

### Privacy policy

Public route: `/privacy`

File:

`src/routes/privacy.tsx`

Replace `MISSING_CONTENT` with the approved privacy policy. The policy should be reviewed by the school’s authorized legal/privacy representative.

### Safeguarding policy

File:

`src/components/institutional/ReferenceLearningPage.tsx`

Replace `[Official safeguarding policy to be provided]` with approved safeguarding information or a link to the official policy document.

Do not invent legal, privacy, safeguarding or child-protection wording.

---

## 12. Careers

### Public routes

- `/careers`
- `/careers/apply`

### Current placeholders

- Approved current vacancies
- Confirmed job locations/campuses
- Official careers contact details

### Enter the data here

CMS job editor:

`/dashboard/cms` → **Job Openings**

Implemented in:

`src/components/dashboard/site/JobOpeningsPanel.tsx`

Legacy fallback content is in:

`src/lib/public-content.ts`

The official careers email fallback is in:

`src/lib/brand.ts`

---

## 13. Portal pages and FAQs

### Current placeholders

- Student Portal feature access
- Parent Portal feature access
- Teacher Portal feature access
- Approved FAQ content

### Enter the data here

Fallback content:

`src/lib/public-content.ts`

Relevant keys include:

- `/digital-school/student-portal`
- `/digital-school/parent-portal`
- `/digital-school/teacher-portal`
- `/faqs`

If these pages are moved to CMS management, update them through:

`/dashboard/cms` → the corresponding page section.

Do not state that a portal feature is available until it is implemented and accessible to the intended role.

---

## 14. CMS-managed placeholder flags

Some content is stored in Supabase and loaded through:

- `src/lib/site-content.ts`
- `src/lib/site-content.functions.ts`

The database-backed collections support `is_placeholder` flags for:

- Site statistics
- Testimonials
- Faculty claims
- Other CMS collections

Manage these through `/dashboard/cms`. After replacing a placeholder with approved content, uncheck **Mark as placeholder**.

The database types are generated in:

`src/integrations/supabase/types.ts`

Do not manually edit the generated Supabase types to change website content.

---

## 15. Legacy placeholder content

`src/lib/public-content.ts` still contains fallback and legacy page definitions with missing-content markers. Some of these are no longer visible because newer custom route components replace them.

Before editing a legacy entry:

1. Open the route file in `src/routes/`.
2. Check whether it renders `PublicPage` using `PUBLIC_PAGES`.
3. If it does, edit the matching key in `src/lib/public-content.ts` or the CMS.
4. If it renders a custom component, update that component/data file instead.

Do not assume every marker in `public-content.ts` is currently visible.

---

## Content ownership summary

| Content type                   | Preferred input location                                          |
| ------------------------------ | ----------------------------------------------------------------- |
| Contact details                | Dashboard CMS → Contact Details; fallback in `src/lib/brand.ts`   |
| Homepage/CMS page sections     | Dashboard CMS → Pages                                             |
| CMS images                     | Dashboard CMS → Media Library / Gallery                           |
| Statistics/testimonials/claims | Dashboard CMS → Collections                                       |
| Job openings                   | Dashboard CMS → Job Openings                                      |
| News articles                  | `src/data/newsData.ts`                                            |
| Notices                        | `src/data/noticeData.ts`                                          |
| Campus directory               | `src/data/campusData.ts` and `src/routes/find-a-campus.tsx`       |
| About gallery                  | `src/data/schoolGalleryData.ts`                                   |
| Teacher training               | `src/data/teacherTrainingData.ts`                                 |
| Chairperson/leadership         | `src/components/about/AboutExperience.tsx`                        |
| Admissions/calendars           | `src/components/institutional/ReferenceAcademicPages.tsx`         |
| Policies                       | Respective route/component or approved PDF in `public/downloads/` |

## Final verification after replacing placeholders

Run:

```powershell
npm run typecheck
npm run lint
npm run build
```

Then search again for unresolved public placeholders:

```powershell
rg -n -i "to be provided|placeholder|awaiting confirmation|official date" src
```

Review every match before launch. Some matches will be internal form placeholder attributes or technical comments and do not represent missing website content.
