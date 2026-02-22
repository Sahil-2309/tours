# Tour Package Automation - Backend API

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the backend directory:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tour-automation
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Get Your API Keys

**MongoDB Atlas:**
1. Go to https://cloud.mongodb.com/
2. Create a cluster (free tier)
3. Get connection string
4. Replace username and password

**Gemini API Key:**
1. Go to https://aistudio.google.com/app/apikey
2. Create API key
3. Copy it to .env file

### 4. Run the Server
```bash
npm run dev    # Development mode with nodemon
npm start      # Production mode
```

Server will run on: http://localhost:5000

---

## 📚 API Documentation for Postman

### Health Check
```
GET http://localhost:5000/api/health
```

---

## 🎨 Template APIs

### 1. Get All Templates
```
GET http://localhost:5000/api/templates
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [...]
}
```

---

### 2. Create Template
```
POST http://localhost:5000/api/templates
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Tour Package Article Template",
  "category": "tour_packages",
  "description": "Template for generating tour package articles",
  "template": "YOU are a professional website content writer.\nYOU write SEO friendly tour package itineraries using the rules below.\n\nITINERARY DETAILS\nDuration: {Duration}\nMeta Title: {Meta Title}\nSEO Title: {SEO Title}\nFocus Keywords: {Focus Keywords}\nMeta Description: {Meta Description}\nTour Itinerary: {Tour Itinerary}\nPickup City: {Pickup City}\nDrop City: {Drop City}\n\n[REST OF YOUR PROMPT HERE]"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Template created successfully",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4a1b",
    "name": "Tour Package Article Template",
    "variables": ["Duration", "Meta Title", "SEO Title", ...]
  }
}
```

---

### 3. Get Template by ID
```
GET http://localhost:5000/api/templates/60d5ec49f1b2c72b8c8e4a1b
```

---

### 4. Update Template
```
PUT http://localhost:5000/api/templates/60d5ec49f1b2c72b8c8e4a1b
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Updated Template Name",
  "template": "Updated template text with {variables}"
}
```

---

### 5. Delete Template
```
DELETE http://localhost:5000/api/templates/60d5ec49f1b2c72b8c8e4a1b
```

---

## 🔌 WordPress APIs

### 1. Save WordPress Configuration
```
POST http://localhost:5000/api/wordpress/config
Content-Type: application/json
```

**Body:**
```json
{
  "siteUrl": "https://your-wordpress-site.com",
  "username": "admin",
  "appPassword": "xxxx xxxx xxxx xxxx"
}
```

**How to get WordPress App Password:**
1. Login to WordPress admin
2. Go to Users → Profile
3. Scroll to "Application Passwords"
4. Create new app password
5. Copy the generated password

---

### 2. Test WordPress Connection
```
POST http://localhost:5000/api/wordpress/test
Content-Type: application/json
```

**Body:**
```json
{
  "siteUrl": "https://your-wordpress-site.com",
  "username": "admin",
  "appPassword": "xxxx xxxx xxxx xxxx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "user": "Admin Name"
}
```

---

### 3. Get WordPress Configuration
```
GET http://localhost:5000/api/wordpress/config
```

---

### 4. Delete WordPress Configuration
```
DELETE http://localhost:5000/api/wordpress/config/60d5ec49f1b2c72b8c8e4a1b
```

---

## 📊 Process APIs

### 1. Process Excel File
```
POST http://localhost:5000/api/process/process
Content-Type: multipart/form-data
```

**Form Data:**
- `excelFile`: [Select your Excel file]
- `templateId`: 60d5ec49f1b2c72b8c8e4a1b

**In Postman:**
1. Select "Body" tab
2. Choose "form-data"
3. Add key "excelFile" with type "File", select your Excel
4. Add key "templateId" with type "Text", paste template ID

**Response:**
```json
{
  "success": true,
  "message": "Processing started",
  "processId": "60d5ec49f1b2c72b8c8e4a1b",
  "totalRows": 20
}
```

---

### 2. Get Process Status
```
GET http://localhost:5000/api/process/status/60d5ec49f1b2c72b8c8e4a1b
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4a1b",
    "fileName": "tour-packages.xlsx",
    "totalRows": 20,
    "successCount": 18,
    "failedCount": 2,
    "status": "partial",
    "failedRows": [
      {
        "rowNumber": 5,
        "error": "Gemini API error: Rate limit exceeded",
        "rowData": {...}
      },
      {
        "rowNumber": 12,
        "error": "WordPress API error: Invalid post data",
        "rowData": {...}
      }
    ],
    "successRows": [...]
  }
}
```

---

### 3. Get All Process History
```
GET http://localhost:5000/api/process/history
```

---

### 4. Retry Failed Rows
```
POST http://localhost:5000/api/process/retry
Content-Type: application/json
```

**Body:**
```json
{
  "processId": "60d5ec49f1b2c72b8c8e4a1b"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Retry started",
  "processId": "60d5ec49f1b2c72b8c8e4a1c",
  "totalRows": 2
}
```

---

## 🔄 Typical Workflow

### Step 1: Create Template
```
POST /api/templates
```

### Step 2: Configure WordPress
```
POST /api/wordpress/config
POST /api/wordpress/test (to verify connection)
```

### Step 3: Process Excel
```
POST /api/process/process (upload Excel + templateId)
```

### Step 4: Check Status
```
GET /api/process/status/{processId}
```

### Step 5: Retry Failed (if any)
```
POST /api/process/retry
```

---

## 🧪 Testing Tips

1. **Test Health Check First:**
   ```
   GET http://localhost:5000/api/health
   ```

2. **Create a Template:**
   - Use your actual prompt text
   - Variables will be auto-extracted

3. **Test WordPress Connection:**
   - Make sure your WP site has REST API enabled
   - Use Application Password, not regular password

4. **Process Small Excel First:**
   - Start with 2-3 rows only
   - Verify everything works
   - Then process full file

5. **Monitor Console:**
   - Backend logs will show progress
   - Watch for errors in real-time

---

## ⚠️ Common Issues

**1. MongoDB Connection Failed:**
- Check connection string in .env
- Whitelist your IP in MongoDB Atlas

**2. Gemini API Error:**
- Verify API key is correct
- Check rate limits (free tier has limits)

**3. WordPress Connection Failed:**
- Ensure REST API is enabled
- Use Application Password, not regular password
- Check if site URL is correct (with https://)

**4. File Upload Error:**
- Max file size is 10MB
- Only .xlsx and .xls files accepted

---

## 📝 Notes

- Processing happens asynchronously
- 1 second delay between each row (to avoid rate limits)
- Failed rows are stored with error details
- You can retry failed rows separately
- All posts are created as "drafts" in WordPress

---

## 🎯 Next Steps

1. Test all APIs in Postman
2. Get Gemini API key
3. Setup WordPress test site
4. Process sample Excel file
5. Build React frontend

Need help? Check the console logs for detailed error messages!
