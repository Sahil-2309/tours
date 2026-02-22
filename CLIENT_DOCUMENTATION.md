# Tour Package Automation – Client Documentation

**Version:** 2.0  
**Last Updated:** February 2026  
**For:** End users and content managers

---

## Table of Contents

1. [What This System Does](#what-this-system-does)
2. [Quick Setup](#quick-setup)
3. [Excel File Requirements](#excel-file-requirements)
4. [AI Prompt Templates – Must-Know](#ai-prompt-templates--must-know)
5. [Full Tour Package Prompt (Standard Template)](#full-tour-package-prompt-standard-template)
6. [Configuration (WordPress & WooCommerce)](#configuration-wordpress--woocommerce)
7. [How to Process Content](#how-to-process-content)
8. [Troubleshooting](#troubleshooting)
9. [Quick Reference](#quick-reference)

---

## What This System Does

This tool automates bulk content creation and publishing:

1. **Excel** → You provide data (titles, descriptions, keywords, etc.)
2. **AI Template** → You write a prompt that tells the AI how to structure content
3. **Gemini AI** → Generates content using your template + Excel data
4. **WordPress / WooCommerce** → Publishes as posts or products

**Flow:**
```
Excel File → Select Template + Platform → AI Generates Content → Published to WordPress/WooCommerce
```

---

## Quick Setup

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env    # Windows
cp .env.example .env     # Mac/Linux
```

Edit `.env` and add:

```
MONGODB_URI=mongodb://localhost:27017/tour-automation
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
```

Get a Gemini API key from: https://aistudio.google.com/app/apikey

```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: **http://localhost:3000**

---

## Excel File Requirements

### Mandatory columns (required for every row)

| Column Name       | Purpose                    | Example                    |
|-------------------|----------------------------|----------------------------|
| Meta Title        | SEO title for post/product | "Best Goa Tour 2025"       |
| Meta Description | SEO meta description       | "Explore Goa beaches..."   |
| Focus Keywords    | Primary SEO keywords       | "goa tour, beach holiday"  |
| Slug              | URL slug (lowercase, hyphens) | "goa-tour-2025"         |

If any of these are missing or empty, the row will fail.

### Optional columns

| Column Name   | Purpose          |
|---------------|------------------|
| OG Image URL  | Social share image |

### WooCommerce only (when posting products)

| Column Name    | Purpose          | Example  |
|----------------|------------------|----------|
| Price          | Product price    | 12999    |
| Regular Price  | Original price   | 14999    |
| Sale Price     | Discounted price | 11999    |
| SKU            | Product code     | GOA-001  |
| Stock Quantity | Available stock  | 50       |

### Content columns (for your AI prompt)

Add any columns you want the AI to use, e.g.:

- Duration, Tour Itinerary, Pickup City, Drop City
- Product Features, Specifications
- Topic, Target Audience, Blog Angle

Use column names as placeholders in your prompt: `{Column Name}`

---

## AI Prompt Templates – Must-Know

### How it works

1. Create a **Template** with a **prompt**.
2. Use placeholders like `{Meta Title}`, `{Duration}` that match Excel column names.
3. For each Excel row, placeholders are replaced with that row’s values.
4. Gemini AI generates content using your prompt + data.

### Placeholder rules

- Use **exact** Excel column names: `{Meta Title}` not `{MetaTitle}`
- Case-sensitive: `{Duration}` ≠ `{duration}`
- Spaces matter

### Must-have elements in your prompt

**1. Output format – Markdown required**

```
Write your response in Markdown format.
Use ## for headings, - for bullets.
Do NOT use HTML.
```

**2. Role/context**

```
You are a professional travel content writer.
Write SEO-optimized tour descriptions.
```

**3. Use Excel data**

```
Title: {Meta Title}
Duration: {Duration}
Keywords: {Focus Keywords}
```

**4. Quality rules**

```
- 400–600 words
- Professional but friendly tone
- Include focus keywords naturally
- End with a call-to-action
```

### Example: Tour package template

```
You are a travel content writer. Write a tour package article in Markdown.

TITLE: {Meta Title}
DURATION: {Duration}
ITINERARY: {Tour Itinerary}
PICKUP: {Pickup City}
DROP: {Drop City}

Instructions:
- Use ## for headings and ### for subheadings
- Write 4–6 paragraphs plus bulleted itinerary
- Include keywords: {Focus Keywords}
- Match style of: {Meta Description}
- End with "Book now"
- Output ONLY Markdown, no HTML
```

### Example: Product description

```
Write a product description in Markdown.

Product: {Meta Title}
Details: {Product Features}

- Use ## headings and bullets
- 300–500 words
- Include {Focus Keywords} naturally
- Professional tone
- Markdown only, no HTML
```

---

## Full Tour Package Prompt (Standard Template)

Use this template when creating tours with itinerary, pricing, policies, hotels, and FAQs. **Excel columns needed:** Meta Title, Meta Description, Focus Keywords, Slug, Duration, Tour Itinerary, Pickup City, Drop City, Total Adults (e.g. "2, 3, 4-7, 8-10, 11-12").

Copy the entire prompt below into the Templates page:

```
YOU are a professional website content writer.
YOU write SEO friendly tour package itineraries using the rules below.

ITINERARY DETAILS
Extract itinerary from the given brief input text:
{Tour Itinerary}
Pickup and drop city as per the itinerary: {Pickup City}, {Drop City}

KEYWORD DETAILS - as per the title
Hotels Budget Category
Total Adults: {Total Adults}

ITINERARY RULES
- Write the day wise itinerary in an informative way. List daily sightseeing places in bullet points.
- Each place name must be bolded with a 3-4 line description.
- No decorative formatting or symbols.
- No introduction or closing remarks before or after itinerary.
- Select 4-5 sightseeing places and insert links of official websites or wikipedia or tripadvisor about them at the end of the Itinerary. No naked link. All links as a hyperlink to some content.

HEADING STRUCTURE AND SEO RULES
- Use H1 for the article headline
- Use H2 headings exactly as follows:
  H2: [Pickup City] to [Destination] Tour Package Itinerary
  H2: [Sub destination 1 and 2] Sightseeing Itinerary
  H2: [Next city or return route] Sightseeing Itinerary
  H2: 3 Star Hotels in [Destination and nearby cities]
  H2: [Destination] Package Price from [Pickup City]
  H2: Inclusions in [Destination] Tour Package
  H2: Exclusions in [Destination] Package from [Pickup City]
  H2: Child Policy for [Destination] Trip from [Pickup City]
  H2: Payment Policy for [Destination] Package Booking
  H2: Cancellation Policy for [Destination] Tour
  H2: Frequently Asked Questions – [Destination] Travel Guide
  H2: Important Travel Information for [Destination] Package
  H2: SEO Details
- Distribute keywords naturally across headings, itinerary, inclusions, FAQs, and SEO sections.
- Use each keyword 2–3 times in natural context.

COST FORMULA
- Dzire or Etios = Rs. 4000 per day for 2 to 4 adults
- Innova = Rs. 6000 per day for 5 to 7 adults
- 12seater Tempo Traveller = Rs. 8000 per day for 8 to 12 adults
- 18seater Tempo Traveller = Rs. 10000 per day for 13 to 18 adults
- For groups above 18 persons, vehicle cost = Rs. 500 per person per day
- Hotel cost = Rs. 1200 per person per night × number of nights (3star hotels)
- Meal plan = Breakfast only
- Driver charges = Included in cab rate
- Add 20 percent on total cost
- Final per person price = Total cost ÷ number of persons
- If Alleppey houseboat is mentioned, add Rs. 3000 per person
- Show only the final per person package price and not the breakup.
- Do not round off, increase, or discount. In rupees only, no paisa.
- Do not use "Total Tour package Price" before any price

AFTER ITINERARY SECTIONS
H2: 3 Star Hotels in [Destination and nearby cities]
Take hotels from your memory and add "or similar" after each name.

H2: [Destination] Package Price from [Pickup City]
Show per person price for each group size: 2, 3, 4–7, 8–10, 11–12.
End with: For long weekend, holidays and festivals, extra charges applicable.

AFTER PRICE SECTION
H2: Inclusions in [Destination] Tour Package
Breakfast, all sightseeing as per itinerary, AC vehicle Dzire or Innova or Tempo Traveller as per group size, driver allowance, parking, tolls, and stay in 3star AC hotels.

H2: Exclusions in [Destination] Package from [Pickup City]
Anything not mentioned in inclusions, entry tickets, boating, guide services, personal expenses, camera fees, or meals other than breakfast.

H2: Child Policy for [Destination] Trip from [Pickup City]
Child up to 6 years Free | Child 6 to 8 years Half charge | Child above 8 years Full charge

H2: Payment Policy for [Destination] Package Booking
20 percent advance at time of booking | 20 percent after getting hotel booking voucher | 60 percent during tour in parts. For tours between 15 Dec to 2 Jan, 50 percent advance payment required.

H2: Cancellation Policy for [Destination] Tour
Minimum Rs. 3000 cancellation charge per person | 10 percent or Rs. 3000 per person whichever is higher | 25 percent between 45-30 days | 50 percent between 30-15 days | 75 percent between 15-5 days | 100 percent within 5 days or no-show. Cancellation charges are percentage of total tour cost.

H2: Frequently Asked Questions – [Destination] Travel Guide
Write 10 FAQs with question and answer in separate paragraph. Questions in bold, answers in normal font.
1. Best time to visit [Destination] 2. Weather conditions 3. Safety for solo travelers 4. Family and couple suitability 5. Famous temples/beaches/attractions 6. Adventure and water activities 7. Local cuisine 8. Ideal trip duration 9. Nearest airports and railheads 10. Tips for first-time travelers
Add relevant outbound links from Wikipedia and TripAdvisor with 1-line content describing each link.

H2: Important Travel Information for [Destination] Package
Weather for summer, winter, monsoon | What to wear | Travel safety | Dos and Don'ts | Mobile/ATMs | Basic etiquette and language. Add relevant links from nic.in and official tourism sites with 1-line descriptions.

H2: Trypdeals tour packages you might be interested in
Include links: https://www.trypdeals.com/ | https://www.trypdeals.com/tours/ | https://www.trypdeals.com/top-travel-destinations/

SEO Details (appear just after Headline, no image)
Meta Description: 140–160 chars, include days, minimum price, destinations, highlights. Keyword natural.
Overview: 100–120 word SEO summary of journey from [pickup] to [destination] with key attractions, natural beauty, cultural experiences, who it suits. Use keyword naturally.

End of article: Write a separate paragraph with headline for each major destination in SEO friendly format, ~100 words each.

Use ONLY Markdown. No HTML. All links as hyperlinks with descriptive text. No naked links.
```

**Excel columns for this template:**
- Meta Title, Meta Description, Focus Keywords, Slug (required)
- Duration, Tour Itinerary, Pickup City, Drop City
- Total Adults (e.g. "2, 3, 4-7, 8-10, 11-12")

---

## Configuration (WordPress & WooCommerce)

### WordPress

1. Go to **WordPress Settings** in the app.
2. Enter:
   - **Site URL:** `https://yoursite.com` (no trailing slash)
   - **Username:** Your WordPress admin username
   - **Application Password:** From WordPress Users → Profile → Application Passwords
3. Click **Test Connection**.
4. If successful, click **Save Configuration**.

**Application Password:** Different from login password. Generate in WordPress under Users → Your Profile → Application Passwords.

### WooCommerce

1. Go to **WooCommerce Settings** in the app.
2. Enter:
   - **Site URL:** Your WooCommerce site URL
   - **Consumer Key** and **Consumer Secret:** From WooCommerce → Settings → Advanced → REST API
3. Create an API key with **Read/Write** permission.
4. Click **Test Connection** → **Save Configuration**.

---

## How to Process Content

1. **Templates** → Create a template with your AI prompt.
2. **Process Excel** → Select template, choose WordPress/WooCommerce/Both.
3. **Upload Excel** → Drop or select your `.xlsx` file.
4. **Start Processing** → Watch progress; content is generated and published.
5. **Results** → View success/failure; retry failed rows if needed.
6. **History** → See all past processing runs.

---

## Troubleshooting

### Rows failing – "Missing SEO fields"

- Ensure Meta Title, Meta Description, Focus Keywords, Slug exist and are not empty.

### WordPress connection fails

- Check Site URL (no trailing slash).
- Use an Application Password, not your normal login password.
- Keep spaces in the Application Password if WordPress shows them.

### Content looks wrong

- Add clearer instructions in your prompt.
- Specify word count and tone.
- Ensure placeholders match Excel column names.

### WooCommerce products fail

- Add a **Price** column; it is required.
- Check REST API credentials (Read/Write).

---

## Quick Reference

| Item          | Requirement                                      |
|---------------|---------------------------------------------------|
| Excel columns | Meta Title, Meta Description, Focus Keywords, Slug |
| Prompt format | Markdown only, no HTML                           |
| Placeholders  | `{Column Name}` matching Excel exactly            |
| WooCommerce   | Price column required                             |
| WordPress     | Application Password (not login password)         |

---

**App URL:** http://localhost:3000  
**Support:** Refer to this document for setup and usage.
